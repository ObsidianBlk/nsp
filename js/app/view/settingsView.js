/* ------------------------------------------------------------------------

  Copyright (C) 2015 Bryan Miller
  
  -------------------------------------------------------------------------

  This file is part of The Nosleep Pod-App (NSP).

  NSP is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  NSP is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with NSP.  If not, see <http://www.gnu.org/licenses/>.

------------------------------------------------------------------------ */


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
      this._ColorAlternator();
      this._ConfigToEntries();
      this._modal.openModal({
	ready:(function(){
	  this._modal.find(".modal-content").scrollTop(0);
	}).bind(this)
      });
    }
  };

  settingsView.prototype.close = function(){
    if (this.open){
      this._modal.closeModal();
    }
  };

  settingsView.prototype._ColorAlternator = function(){
    var row = 0;
    this._modal.find(".color-alternation").each(function(){
      var item = $(this);
      if (item.css("display") !== "none"){
	if (row === 0 || row%2 === 0){
	  item.removeClass("nsp-grey darken");
	} else {
	  item.addClass("nsp-grey darken");
	}
	row++;
      }
    });
  };

  settingsView.prototype._ConfigToEntries = function(){
    this._modal.find("#database_path").val(NSP.config.path.database);
    this._modal.find("#playlist_path").val(NSP.config.path.playlists);
    this._modal.find("#imagecache_path").val(NSP.config.path.images);
    this._modal.find("#audiocache_path").val(NSP.config.path.audio);
    this._modal.find("#downloadFeedAtStartup")[0].checked = NSP.config.downloadFeedAtStartup;
    this._modal.find("#playIntroAtStartup")[0].checked = NSP.config.playIntroAtStartup;
    this._modal.find("#showEditor")[0].checked = NSP.config.showEditor;
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
    NSP.config.showEditor = this._modal.find("#showEditor")[0].checked;
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
