

module.exports = (function(){

  var Events = require("events");
  var story = require("./story");
  var DescParser = require("../util/descParser");
  

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
	s.on("changed", function(){ep.emit("changed");});
	ep._story.push(s);
      }
    } else {
      throw new Error("Episode property 'story' expected to be an Array. Given " + typeof(item.story) + ".");
    }

    // Now... using the title... let's see if we can guess the season/episode!
    var episode = 0;
    var match = ep._title.match(/NoSleep Podcast (S\d{1,2})(E\d{1,2}[a-zA-Z]{0,1})/);
    if (match !== null && match.length > 2){
      var season = parseInt(match[1].substr(1));
      episode = parseInt(match[2].substr(1));
      ep.addTag("season " + season);
      ep.addTag("episode " + episode);
    } else {
      // Special case for Season 1 titles!
      match = ep._title.match(/NoSleep Podcast (#\d{1,2})/);
      if (match !== null && match.length > 1){
	episode = parseInt(match[1].substr(1));
	ep.addTag("season 1");
	ep.addTag("episode " + episode);
      }
    }
    // Could it be a "bonus" episode?
    match = ep._title.match(/NoSleep Podcast(.*?)([B|b][O\o][N|n][U|u][S|s])(.*?)/);
    if (match !== null){
      ep.addTag("bonus");
    }
    // Does the title have a subtitle?
    match = ep._title.match(/(.*?) - (.*?)/);
    ep._subTitle = (match !== null && match.length > 2) ? match[2] : "";

    ep._audio_path = (typeof(item.audio_path) === 'string') ? item.audio_path : "";
    ep._audio_type = (typeof(item.audio_type) === 'string') ? item.audio_type : "audio/mpeg";
    ep._audio_length = (typeof(item.audio_length) === 'string') ? item.audio_length : "0";
    ep._description = (typeof(item.description) === 'string') ? item.description : "";
    ep._shortDescription = (typeof(item.short_description) === 'string') ? item.short_description : "";
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

	  var descObj = (typeof(obj.description) === 'string') ? DescParser(obj.description) : 
	    {shortdesc:"An episode of the No Sleep Podcast", story:[]};

          var nobj = {
            title:obj.title,
            short_description:descObj.shortdesc,
	    description:obj.description,
            author:obj.author,
            date:(obj.pubDate instanceof Date) ? obj.pubDate.toString() : "",
            guid:obj.guid,
            audio_src:obj.enclosures[0].url,
            audio_type:obj.enclosures[0].type,
            audio_length: obj.enclosures[0].length,
	    story:descObj.story
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
    this._subTitle = null;
    this._guid = null;
    this._audio_src = null;
    this._audio_path = null;

    this._tag = [];
    this._story = [];
    
    this._audio_type = "audio/mpeg";
    this._audio_length = "0";
    this._description = "";
    this._shortDescription = "";
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

    if (this._subTitle !== ""){
      data.sub_title = this._subTitle;
    }
    if (this._description !== ""){
      data.description = this._description;
    }
    if (this._shortDescription !== ""){
      data.short_description = this._shortDescription;
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

    return JSON.stringify(data, null, '\t');
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

  episode.prototype.tag = function(index){
    if (index >= 0 && index < this._tag.length){
      return this._tag[index];
    }
    throw new RangeError();
  };

  episode.prototype.hasTag = function(tag){
    for (var i=0; i < this._tag.length; i++){
      if (tag === this._tag[i]){
        return true;
      }
    }
    return false;
  };

  episode.prototype.hasTagLike = function(tag){
    var reg = new RegExp("(.*?)" + tag + "(.*)");
    for (var i=0; i < this._tag.length; i++){
      if (this._tag[i].match(reg) !== null){
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
      return this._story[index];
    }
    return null;
  };

  episode.prototype.storyByTime = function(time){
    if (typeof(time) === 'string'){
      var t = time.split(":");
      if (t.length > 0 && t.length <= 3){
	t.reverse();
	time = 0;
	for (var i=0; i < t.length; i++){
	  time += parseInt(t[i])*Math.pow(60, i);
	}
      } else {
	throw new TypeError();
      }
    } else if (typeof(time) !== 'number' || time%1 === 0){
      throw new TypeError();
    }

    if (time >= 0 && time < this.audio_length && this._story.length > 0){
      var storyBT = this._story.filter(function(s){
	if (s.beginningSec <= 0 || s.beginningSec > time){
	  return false;
	}
	return true;
      });

      if (storyBT.length > 0){
	var story = null;
	var timeIn = 0;
	for (var i=0; i < storyBT.length; i++){
	  var tin = storyBT[i].beginningSec - time;
	  if (story === null || timeIn > tin){
	    story = storyBT;
	    timeIn = tin;
	  }
	}

	return story;
      }
    }
    return null;
  };

  episode.prototype.estimateStoryEndTime = function(story_or_index){
    var index = story_or_index;
    if (story_or_index instanceof story){
      index = this.getStoryIndexByTitle(story_or_index.title);
    }
    if (index >= 0 && index < this._story.length){
      var nsi = -1;
      var nst = 0;
      var st = this._story[index].beginningSec;
      if (st > 0){
	if (this._story[index].endingSec > 0){
	  return this._story[index].endingSec;
	}
	for (var i=0; i < this._story.length; i++){
	  if (i !== index){
	    if (this._story.beginningSec > st && (nsi === -1 || this._story.beginningSec < nst)){
	      nsi = i;
	      nst = this._story.beginningSec - 2; // Buffer two seconds.
	    }
	  }
	}

	if (nsi < 0){
	  // This may be the last episode, so... assume it ends when the episode itself ends.
	  return this.audio_length;
	}
      }
    }
    return 0;
  };

  episode.prototype.getStoryIndexByTitle = function(title){
    for (var i=0; i < this._story.length; i++){
      if (this._story[i].title === title){
	return i;
      }
    }
    return -1;
  };

  Object.defineProperties(episode.prototype, {
    "json":{
      get:function(){return this.toString();},
      set:function(str){
	if (typeof(str) !== 'string'){throw new TypeError();}
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
	if (typeof(title) !== 'string'){throw new TypeError();}
        this._title = title;
        this.emit("changed");
      }
    },

    "subTitle":{
      get:function(){return this._subTitle;},
      set:function(subTitle){
	if (typeof(subTitle) !== 'string'){throw new TypeError();}
	this._subTitle = subTitle;
	this.emit("changed");
      }
    },

    "description":{
      get:function(){return this._description;},
      set:function(desc){
	if (typeof(desc) !== 'string'){throw new TypeError();}
        this._description = desc;
        this.emit("changed");
      }
    },

    "shortDescription":{
      get:function(){return this._shortDescription;},
      set:function(desc){
	this._shortDescription = desc;
	this.emit("changed");
      }
    },

    "guid":{
      get:function(){return this._guid;}
    },

    "tagCount":{
      get:function(){return this._tag.length;}
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
	if (typeof(link) !== 'string'){throw new TypeError();}
        this._link = link;
        this.emit("changed");
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

    "audio_path":{
      get:function(){return this._audio_path;},
      set:function(path){
	if (typeof(path) !== 'string'){throw new TypeError();}
	this._audio_path = path;
	this.emit("changed");
      }
    },

    "audio_src":{
      get:function(){return this._audio_src;}
    },

    "audio_filename":{
      get:function(){
	var url = this._audio_src;
	//this removes the anchor at the end, if there is one
	url = url.substring(0, (url.indexOf("#") == -1) ? url.length : url.indexOf("#"));
	//this removes the query after the file name, if there is one
	url = url.substring(0, (url.indexOf("?") == -1) ? url.length : url.indexOf("?"));
	//this removes everything before the last slash in the path
	url = url.substring(url.lastIndexOf("/") + 1, url.length);
	return url;
      }
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
	if (typeof(src) !== 'string'){throw new TypeError();}
        this._img_src = src;
        this.emit("changed");
      }
    }
  });

  return episode;
})();
