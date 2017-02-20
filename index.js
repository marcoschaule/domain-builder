const fs    = require('fs');
const curl  = require('curl');
const async = require('async');
const exec  = require('child_process').exec;
const Table = require('cli-table');

let strObjSettings    = fs.readFileSync('./settings.json', { encoding: 'utf-8' });
let objSettings       = JSON.parse(strObjSettings);
let arrNames          = objSettings.names;
let arrTLDs           = objSettings.topLevelDomains;
let arrDomainNames    = [];
let arrAvailableNames = [];

let strCurrent, strNameLeft, strNameRight, strTLD;
let isNameLeftPossible, isNameRightPossible, isNameIgnored;

let table = new Table({
  head     : ['domain', 'availability', 'Link'],
  colWidths: [40, 20, 100]
});

function replacer(strFound, strFirst) {
  return strFirst;
}

outer:
    for (let i = 0; i < arrNames.length; i++) {
      strNameLeft        = arrNames[i];
      isNameLeftPossible = strNameLeft.indexOf('!') !== 0;
      isNameIgnored      = strNameLeft.indexOf('#') === 0;
      strNameLeft        = strNameLeft.replace(/^\!/, '').replace(/\!$/, '');

      if (isNameIgnored) {
        continue;
      }

      inner:
          for (let j = 0; j < arrNames.length; j++) {
            strNameRight        = arrNames[j];
            isNameRightPossible = strNameRight.indexOf('!') !== (strNameRight.length - 1);
            isNameIgnored       = strNameRight.indexOf('#') === 0;
            strNameRight        = strNameRight.replace(/^\!/, '').replace(/\!$/, '');

            if (isNameIgnored) {
              continue outer;
            }

            for (let k = 0; k < arrTLDs.length; k++) {
              strTLD = arrTLDs[k];

              if (strNameLeft === strNameRight || !isNameLeftPossible || !isNameRightPossible) {
                continue inner;
              }

              if (true) {
                strCurrent = strNameLeft + strNameRight + '.' + strTLD;
                if (arrDomainNames.indexOf(strCurrent) < 0) {
                  arrDomainNames.push(strCurrent);
                }
              }

              if (objSettings.useDash) {
                strCurrent = strNameLeft + '-' + strNameRight + '.' + strTLD;
                if (arrDomainNames.indexOf(strCurrent) < 0) {
                  arrDomainNames.push(strCurrent);
                }
              }

              if (objSettings.useNonDoubles) {
                strCurrent = (strNameLeft + strNameRight + '.' + strTLD).replace(/(.)\1/g, replacer);
                if (arrDomainNames.indexOf(strCurrent) < 0) {
                  arrDomainNames.push(strCurrent);
                }
              }
            }
          }
    }

async.each(arrDomainNames,

    // repeater
    (strDomainName, callback) => {
      let strDomain      = objSettings.domainPrefix + strDomainName;
      let strCommandFull = objSettings.command + strDomain;

      exec(strCommandFull, function(objErr, stdout, stderr) {
        let isAvailable = stdout.indexOf(objSettings.errorLabel) >= 0;
        if (isAvailable) {
          table.push([strDomainName, '√', objSettings.checkURL + strDomain]);
          arrAvailableNames.push(strDomainName);
        } else if (!isAvailable && !objSettings.showAvailableOnly) {
          table.push([strDomainName, '']);
        }
        return callback(null);
      });

    },

    // callback
    (objErr) => {
      if (objSettings.showResult && objSettings.showAsTable) {
        console.log(table.toString());
      } else if (objSettings.showResult) {
        console.log(arrAvailableNames.join('   '));
      }
    }
);
