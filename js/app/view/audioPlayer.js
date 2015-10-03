
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.AudioPlayer = (function(){

  var Events = require('events');

  function TimeToTag(starttime, endtime){
    var tag = "#t=";
    if (typeof(starttime) === 'string' && starttime.match(/\d{1,2}:\d{1,2}:\d{1,2}/) !== null){
      tag += starttime;
    } else if (typeof(starttime) === 'number'){
      tag += starttime.toString();
    }

    if (typeof(endtime) === 'string' && endtime.match(/\d{1,2}:\d{1,2}:\d{1,2}/) !== null){
      tag += ","+endtime;
    } else if (typeof(endtime) === 'number'){
      tag += ","+endtime.toString();
    }

    return tag;
  }

  function audioPlayer(system_id){
    if (typeof(system_id) !== 'string'){system_id="#Audio_System";}
    
    this._currentlyPlaying = "";
    this._showingControls = false;
    this._player = $(system_id);
    this._source = $("#Audio_Source");
    if (this._player.length <= 0){
      throw new Error("No audio system found.");
    }
  }
  audioPlayer.prototype.__proto__ = Events.EventEmitter.prototype;
  audioPlayer.prototype.constructor = audioPlayer;

  audioPlayer.prototype.play = function(url, starttime, endtime){
    if (typeof(url) === 'string'){
      this._currentlyPlaying = url;
    }

    var tag = TimeToTag(starttime, endtime);
    tag = (tag !== "#t=") ? tag : "";
    this._player[0].pause();
    this._source.attr("src", this._currentlyPlaying+tag).attr("type","audio/mp3");
    this._player[0].load();
    this._player.on("load", function(){console.log("audio");});
  };

  audioPlayer.prototype.stop = function(){
    this._player[0].pause();
  };


  return audioPlayer;
})();
