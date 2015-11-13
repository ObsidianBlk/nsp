
var Path = require("path");


module.exports = function(AppName){
  var homepath = "";
  var apppath = "";
  if (process.platform === "win32"){
    homepath = (typeof(process.env["USERPROFILE"]) === 'string') ? process.env["USERPROFILE"] : process.env["HOMEPATH"];
    apppath = "Application Data";
  } else if (process.platform === "darwin" || process.platform === "linux"){
    homepath = process.env["HOME"];
    apppath = (process.platform === "darwin") ? "Library/Application Support" : ".config";
  }

  if (homepath !== "" && apppath !== ""){
    return Path.normalize(Path.join(homepath, apppath, AppName));
  }
  return ""; // Cheap exit.
};
