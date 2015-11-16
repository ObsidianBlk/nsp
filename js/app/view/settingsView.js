
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.SettingsView = (function(){

  var Events = require('events');

  function settingsView(id){
    this._modal = $(id);
    this._ConfigureButtons();
  };
  settingsView.prototype.__proto__ = Events.EventEmitter.prototype;
  settingsView.prototype.constructor = settingsView;

  settingsView.prototype.openModal = function(){
    if (!this.open){
      this._ConfigToEntries();
      this._modal.openModal();
    }
  };

  settingsView.prototype.close = function(){
    if (this.open){
      this._modal.closeModal();
    }
  };

  settingsView.prototype._ConfigToEntries = function(){
    this._modal.find("#database_path").val(NSP.config.path.database);
    this._modal.find("#playlist_path").val(NSP.config.path.playlists);
    this._modal.find("#imagecache_path").val(NSP.config.path.images);
    this._modal.find("#audiocache_path").val(NSP.config.path.audio);
    this._modal.find("#downloadFeedAtStartup")[0].checked = NSP.config.downloadFeedAtStartup;
    this._modal.find("#playIntroAtStartup")[0].checked = NSP.config.playIntroAtStartup;
    this._modal.find("#autoCacheImages")[0].checked = NSP.config.autoCacheImages;
    this._modal.find("#autoSaveDatabaseOnChange")[0].checked = NSP.config.autoSaveDatabaseOnChange;
  };

  settingsView.prototype._EntriesToConfig = function(){
    NSP.config.path = {
      database: this._modal.find("#database_path").val(),
      playlists: this._modal.find("#playlist_path").val(),
      images: this._modal.find("#imagecache_path").val(),
      audio: this._modal.find("#audiocache_path").val()
    };
    NSP.config.downloadFeedAtStartup = this._modal.find("#downloadFeedAtStartup")[0].checked;
    NSP.config.playIntroAtStartup = this._modal.find("#playIntroAtStartup")[0].checked;
    NSP.config.autoCacheImages = this._modal.find("#autoCacheImages")[0].checked;
    NSP.config.autoSaveDatabaseOnChange = this._modal.find("#autoSaveDatabaseOnChange")[0].checked;
  };

  settingsView.prototype._ConfigureButtons = function(){
    var act_apply = this._modal.find(".action-settings-apply");
    var act_reset = this._modal.find(".action-settings-reset");
    var act_close = this._modal.find(".action-settings-close");

    act_apply.on("click", (function(){
      this._EntriesToConfig();
      NSP.config.save();
      this.close();
    }).bind(this));

    act_reset.on("click", (function(){
      this._ConfigToEntries();
    }).bind(this));

    act_close.on("click", (function(){
      this.close();
    }).bind(this));
  };

  Object.defineProperties(settingsView.prototype, {
    "open":{
      get:function(){
	return this._modal.css("display") !== "none";
      }
    }
  });

  return settingsView;
})();
