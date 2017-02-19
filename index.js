var fs              = require('fs');
var curl            = require('curl');
var async           = require('async');
var exec            = require('child_process').exec;
var Table           = require('cli-table');

var strObjSettings  = fs.readFileSync('./settings.json', { encoding: 'utf-8' });
var objSettings     = JSON.parse(strObjSettings);
var arrNames        = objSettings.names;
var arrTLDs         = objSettings.topLevelDomains;
var arrDomainNames  = [];
var arrAvailableNames = [];

var strCurrent, strNameLeft, strNameRight, strTLD;
var isNameLeftPossible, isNameRightPossible;


var table = new Table({
  head     : ['domain', 'availability', 'Link'],
  colWidths: [40, 20, 100]
});

function replacer(strFound, strFirst) {
  return strFirst;
}

outer:
for (var i = 0; i < arrNames.length; i++) {
  strNameLeft        = arrNames[i];
  isNameLeftPossible = strNameLeft.indexOf('!') !== 0;
  strNameLeft        = strNameLeft.replace(/^\!/, '').replace(/\!$/, '');

  inner:
  for (var j = 0; j < arrNames.length; j++) {
    strNameRight        = arrNames[j];
    isNameRightPossible = strNameRight.indexOf('!') !== (strNameRight.length - 1);
    strNameRight        = strNameRight.replace(/^\!/, '').replace(/\!$/, '');

    for (var k = 0; k < arrTLDs.length; k++) {
      strTLD = arrTLDs[k];

      if (strNameLeft === strNameRight ||
          !isNameLeftPossible ||
          !isNameRightPossible) {
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
    var strDomain      = objSettings.domainPrefix + strDomainName;
    var strCommandFull = objSettings.command + strDomain;

    exec(strCommandFull, function(objErr, stdout, stderr) {
      var isAvailable = stdout.indexOf(objSettings.errorLabel) >= 0;
      if (isAvailable) {
        table.push([strDomainName, '√', objSettings.checkURL + strDomain]);
        arrAvailableNames.push(strDomainName);
      }
      else if (!isAvailable && !objSettings.showAvailableOnly) {
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
