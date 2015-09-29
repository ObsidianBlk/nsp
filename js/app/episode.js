

module.exports = (function(){

  var Events = require("events");
  var story = require("./story");
  

  function VerifyEpisode(ep, item){
    if (typeof(item) !== typeof({})){
      throw new Error("Episode is not an object.");
    }

    if (typeof(item.title) !== 'string'){
      throw new Error("Episode missing property 'title'.");
    }
    if (typeof(item.guid) !== 'string'){
      throw new Error("Episode missing property 'guid'.");
    }
    if (typeof(item.audio_src) !== 'string'){
      throw new Error("Episode missing property 'audio_src'.");
    }
    ep._title = item.title;
    ep._guid = item.guid;
    ep._audio_src = item.audio_src;
    
    var i = 0;
    if (typeof(item.tag) === 'undefined'){
      ep._tag = [];
    } else if (item.tag instanceof Array){
      for (i=0; i < item.tag.length; i++){
        if (typeof(item.tag[i]) !== 'string'){
          throw new Error("Episode tags expected to be strings. Given " + typeof(item.tag[i]) + ".");
        } else {
          ep._tag.push(item.tag[i].toLowerCase());
        }
      }
    } else {
      throw new Error("Episode property 'tag' expected to be an Array. Given " + typeof(item.tag) + ".");
    }

    if (typeof(item.story) === 'undefined'){
      ep._story = [];
    } else if (item.story instanceof Array){
      ep._story = [];
      for (i=0; i < item.story.length; i++){
	try{
	  var s = new story(item.story[i]);
	} catch (e) {throw e;}
	ep._story.push(s);
      }
    } else {
      throw new Error("Episode property 'story' expected to be an Array. Given " + typeof(item.story) + ".");
    }

    ep._audio_type = (typeof(item.audio_type) === 'string') ? item.audio_type : "audio/mpeg";
    ep._audio_length = (typeof(item.audio_length) === 'string') ? item.audio_length : "0";
    ep._description = (typeof(item.description) === 'string') ? item.description : "";
    ep._link = (typeof(item.link) === 'string') ? item.link : "";
    ep._date = (typeof(item.date) === 'string') ? item.date : "";
    ep._img_src = (typeof(item.img_src) === 'string') ? item.img_src : "";
  }

  function ParseObjToEpisode(ep, obj){
    if (typeof(obj) === typeof({})){
      if (typeof(obj.enclosures) === 'undefined'){
        VerifyEpisode(ep, obj);
      } else if (obj.enclosures instanceof Array){
        if (obj.enclosures.length > 0){
          if (typeof(obj.enclosures[0].url) !== 'string'){
            throw new Error("No audio information in object.");
          }

	  console.log(typeof(obj.pubDate));
          var nobj = {
            title:obj.title,
            description:obj.description,
            author:obj.author,
            date:(obj.pubDate instanceof Date) ? obj.pubDate.toString() : "",
            guid:obj.guid,
            audio_src:obj.enclosures[0].url,
            audio_type:obj.enclosures[0].type,
            audio_length: obj.enclosures[0].length
          };
          if (typeof(obj.image) === typeof({}) && typeof(obj.image.url) === 'string'){
            nobj.img_src = obj.image.url;
          }

          try {
            VerifyEpisode(ep, nobj);
          } catch (e) {
            throw e;
          }
          
        } else {
          throw new Error("No audio information in object.");
        }
      } else {
        throw new Error("Unknown Object.");
      }
    } else {
      throw new Error("Episode is not an object.");
    }
  }
  

  function episode(edata){
    this._title = null;
    this._guid = null;
    this._audio_src = null;

    this._tag = [];
    this._story = [];
    
    this._audio_type = "audio/mpeg";
    this._audio_length = "0";
    this._description = "";
    this._link = "";
    this._date = "";
    this._img_src = "";

    try {
      ParseObjToEpisode(this, edata);
    } catch (e){
      throw e;
    }
  };
  episode.prototype.__proto__ = Events.EventEmitter.prototype;
  episode.prototype.constructor = episode;

  episode.prototype.fromString = function(str){
    try {
      VerifyEpisode(this, JSON.parse(str));
      this.emit("changed");
    } catch (e) {
      throw e;
    }
    this.emit("changed", null);
  };

  episode.prototype.toString = function(){
    var data = {
      guid: this._guid,
      title: this._title,
      audio_src: this._audio_src,
      audio_type: this._audio_type,
      audio_length: this._audio_length
    };

    if (this._tag.length > 0){
      data.tag = this._tag;
    }
    if (this._story.length > 0){
      data.story = [];
      for (var i=0; i < this._story.length; i++){
	data.story.push(JSON.parse(this._story[i].toString()));
      }
    }

    if (this._description !== ""){
      data.description = this._description;
    }
    if (this._link !== ""){
      data.link = this._link;
    }
    if (this._date !== ""){
      data.date = this._date;
    }
    if (this._img_src !== ""){
      data.img_src = this._img_src;
    }

    return JSON.stringify(data);
  };

  episode.prototype.addTag = function(tag){
    tag = tag.toLowerCase();
    if (!this.hasTag(tag)){
      this._tag.push(tag);
      this.emit("changed", null);
    }
  };

  episode.prototype.removeTag = function(tag){
    tag = tag.toLowerCase();
    for (var i=0; i < this._tag.length; i++){
      if (tag === this._tag[i]){
        this._tag.splice(i, 1);
        this.emit("changed", null);
        break;
      }
    }
  };

  episode.prototype.hasTag = function(tag){
    for (var i=0; i < this._tag.length; i++){
      if (tag === this._tag[i]){
        return true;
      }
    }
    return false;
  };

  episode.prototype.addStory = function(sdata){
    if (typeof(sdata) === typeof({})){
      try {
	var s = new story(sdata);
	this._story.push(s);
	this.emit("changed");
      } catch (e) {throw e;}
    } else if (sdata instanceof story){
      this._story.push(sdata);
      this.emit("changed");
    }
  };

  episode.prototype.removeStory = function(index){
    if (index >= 0 && index < this._story.length){
      this._story.splice(index, 1);
      this.emit("changed");
    }
  };

  episode.prototype.story = function(index){
    if (index >= 0 && index < this._story.length){
      return this._story[i];
    }
    return null;
  };


  Object.defineProperties(episode.prototype, {
    "json":{
      get:function(){return this.toString();},
      set:function(str){
        try {
          this.fromString(str);
        } catch (e) {
          throw e;
        }
      }
    },

    "title":{
      get:function(){return this._title;},
      set:function(title){
        this._title = title;
        this.emit("changed", null);
      }
    },

    "description":{
      get:function(){return this._description;},
      set:function(desc){
        this._description = desc;
        this.emit("changed", null);
      }
    },

    "guid":{
      get:function(){return this._guid;}
    },

    "tags":{
      get:function(){return this._tag.join(",");}
    },

    "storyCount":{
      get:function(){return this._story.length;}
    },

    "link":{
      get:function(){return this._link;},
      set:function(link){
        this._link = link;
        this.emit("changed", null);
      }
    },

    "date":{
      get:function(){
	if (this._date !== ""){
	  var d = new Date(this._date);
	  if (!isNaN(d.getTime())){
	    return d;
	  }
	}
	return null;
      }
    },

    "audio_src":{
      get:function(){return this._audio_src;}
    },

    "audio_length":{
      get:function(){return this._audio_length;}
    },

    "audio_type":{
      get:function(){return this._audio_type;}
    },

    "img_src":{
      get:function(){return this._img_src;},
      set:function(src){
        this._img_src = src;
        this.emit("changed", null);
      }
    }
  });

  return episode;
})();
