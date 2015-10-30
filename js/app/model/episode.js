

module.exports = (function(){

  var Events = require("events");
  var story = require("./story");
  var DescParser = require("../util/descParser");
  var Time = require("../util/time");
  

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
	  var s = new story(item.story[i], ep);
	} catch (e) {throw e;}
	s.on("changed", function(){ep.emit("changed");});
	ep._story.push(s);
      }
    } else {
      throw new Error("Episode property 'story' expected to be an Array. Given " + typeof(item.story) + ".");
    }

    // Check for season/episode numbers
    if (typeof(item.season) === 'number' && typeof(item.episode) === 'number'){
      ep._season = item.season;
      ep._episode = item.episode;
    } else {
      // Now... using the title... let's see if we can guess the season/episode!
      var episode = 0;
      var match = ep._title.match(/No[Ss]leep Podcast (S\d{1,2})(E\d{1,2}[a-zA-Z]{0,1})/);
      if (match !== null && match.length > 2){
	var season = parseInt(match[1].substr(1));
	episode = parseInt(match[2].substr(1));
	ep._season = season;
	ep._episode = episode;
	ep.addTag("season " + season);
	ep.addTag("episode " + episode);
      } else {
	// Special case for Season 1 titles!
	match = ep._title.match(/Nosleep Podcast (#\d{1,2})/);
	if (match !== null && match.length > 1){
	  episode = parseInt(match[1].substr(1));
	  ep._season = 1;
	  ep._episode = episode;
	  ep.addTag("season 1");
	  ep.addTag("episode " + episode);
	}
      }
    }
    // Could it be a "bonus" episode?
    match = ep._title.match(/No[Ss]leep Podcast(.*?)([B|b][O\o][N|n][U|u][S|s])(.*?)/);
    if (match !== null){
      ep.addTag("bonus");
    }
    // Does the title have a subtitle?
    match = ep._title.match(/(.*?) - (.*?)/);
    ep._subTitle = (match !== null && match.length > 2) ? match[2] : "";

    ep._audio_path = (typeof(item.audio_path) === 'string') ? item.audio_path : "";
    ep._audio_type = (typeof(item.audio_type) === 'string') ? item.audio_type : "audio/mpeg";
    ep._audio_duration = (typeof(item.audio_duration) === 'string') ? item.audio_duration : "00:00:00";
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

    this._season = 0;
    this._episode = 0;

    this._audio_src = null;
    this._audio_path = null;

    this._tag = [];
    this._story = [];
    
    this._audio_type = "audio/mpeg";
    this._audio_duration = "00:00:00";
    this._description = "";
    this._shortDescription = "";
    this._link = "";
    this._date = "";
    this._img_src = "";

    try {
      ParseObjToEpisode(this, edata);
      this._CalculateEstimatedStoryEndTimes();
    } catch (e){
      throw e;
    }
  };
  episode.prototype.__proto__ = Events.EventEmitter.prototype;
  episode.prototype.constructor = episode;

  episode.prototype.fromString = function(str){
    try {
      VerifyEpisode(this, JSON.parse(str));
      this._CalculateEstimatedStoryEndTimes();
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
    if (this._season > 0){
      data.season = this._season;
    }
    if (this._episode > 0){
      data.episode = this._episode;
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

  episode.prototype.setTags = function(tagstr, delimiter){
    delimiter = (typeof(delimiter) === 'string') ? delimiter : ",";
    this._tag = [];
    this.addTag(tagstr, delimiter);
  };

  episode.prototype.addTag = function(tagstr, delimiter){
    delimiter = (typeof(delimiter) === 'string') ? delimiter : ",";
    var added = false;
    if (tagstr.length > 0){
      var tags = tagstr.split(delimiter);
      for (var i=0; i < tags.length; i++){
	var tag = tags[i].trim();
	if (tag.length > 0){
	  if (this.hasTag(tag) === false){
	    this._tag.push(tag);
	    added = true;
	  }
	}
      }
      if (added){
	this.emit("changed", null);
      }
    }
  };

  episode.prototype.removeTag = function(tagstr, delimiter){
    delimiter = (typeof(delimiter) === 'string') ? delimiter : ",";
    var removed = false;
    if (tagstr.length > 0){
      var tags = tagstr.split(delimiter);
      for (var i=0; i < tags.length; i++){
	var tag = tags[i].trim().toLowerCase();
	if (tag.length > 0){
	  for (var t=0; t < this._tag.length; t++){
	    if (tag === this._tag[t].toLowerCase()){
              this._tag.splice(t, 1);
	      removed = true;
              break;
	    }
	  }
	}
      }
      if (removed){
	this.emit("changed", null);
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
    var ltag = tag.toLowerCase();
    for (var i=0; i < this._tag.length; i++){
      if (ltag === this._tag[i].toLowerCase()){
        return true;
      }
    }
    return false;
  };

  episode.prototype.hasTagLike = function(tag){
    var reg = new RegExp("(.*?)" + tag.toLowerCase() + "(.*)");
    var ltag = tag.toLowerCase();
    for (var i=0; i < this._tag.length; i++){
      if (this._tag[i].toLowerCase() === ltag || reg.test(this._tag[i].toLowerCase())){
	return true;
      }
      for (var s=0; s < this._story.length; s++){
	if (this._story[s].hasTagLike(tag)){
	  return true;
	}
      }
    }
    return false;
  };

  episode.prototype.writers = function(writers){
    if (typeof(writers) === 'undefined' || writers === null){
      writers = [];
    }

    // NOTE: This is a very hack array test.
    // The webkit and nodeJS contexts have different "Array" types that do not match with instanceof
    if (typeof(writers.length) === 'undefined'){
      throw new TypeError();
    }

    for (var i=0; i < this._story.length; i++){
      for (var w=0; w < this._story[i].writerCount; w++){
	var writer = this._story[i].writer(w);
	var key = writer.name.toLowerCase();
	for (var k=0; k < writers.length; k++){
	  if (writers[k].key === key){
	    if (writer.link !== null && writers[k].link === null){
	      writers[k].link = writer.link;
	    }

	    for (var e=0; e < writers[k].episode.length; e++){
	      if (writers[k].episode[e].guid === this.guid){
		writers[k].episode[e].story.push(this._story[i].title);
		key = null;
		break;
	      }
	    }
	    if (key !== null){
	      writers[k].episode.push({
		guid: this.guid,
		story:[]
	      });
	      writers[k].episode[writers[k].episode.length-1].story.push(this._story[i].title);
	      key = null;
	    }
	    break;
	  }
	}

	if (key !== null){
	  var ent = {
	    key:key,
	    name:writer.name,
	    link:writer.link,
	    episode:[]
	  };
	  ent.episode.push({guid:this.guid, story:[]});
	  ent.episode[0].story.push(this._story[i].title);
	  writers.push(ent);
	}
      }
    }
    return writers;
  };


  episode.prototype.narrators = function(narrators){
    if (typeof(narrators) === 'undefined' || narrators === null){
      narrators = [];
    }

    // NOTE: This is a very hack array test.
    // The webkit and nodeJS contexts have different "Array" types that do not match with instanceof
    if (typeof(narrators.length) === 'undefined'){
      throw new TypeError();
    }

    for (var i=0; i < this._story.length; i++){
      for (var n=0; n < this._story[i].narratorCount; n++){
	var nar = this._story[i].narrator(n);
	var key = nar.name.toLowerCase();

	for (var k=0; k < narrators.length; k++){
	  if (narrators[k].key === key){
	    if (nar.link !== null && narrators[k].link === null){
	      narrators[k].link = nar.link;
	    }
	    for (var e=0; e < narrators[k].episode.length; e++){
	      if (narrators[k].episode[e].guid === this.guid){
		narrators[k].episode[e].story.push(this._story[i].title);
		key = null;
		break;
	      }
	    }
	    if (key !== null){
	      narrators[k].episode.push({
		guid: this.guid,
		story: []
	      });
	      narrators[k].episode[narrators[k].episode.length-1].story.push(this._story[i].title);
	      key = null;
	    }
	    break;
	  }
	}

	if (key !== null){
	  var ent = {
	    key:key,
	    name:nar.name,
	    link:nar.link,
	    episode:[]
	  };
	  ent.episode.push({
	    guid: this.guid,
	    story: []
	  });
	  ent.episode[0].story.push(this._story[i].title);
	  narrators.push(ent);
	}
      }
    }

    return narrators;
  };

  episode.prototype.hasWriter = function(writer_name){
    for (var i=0; i < this._story.length; i++){
      if (this._story[i].hasWriter(writer_name)){
	return true;
      }
    }
    return false;
  };

  episode.prototype.hasNarrator = function(narrator_name){
    for (var i=0; i < this._story.length; i++){
      if (this._story[i].hasNarrator(narrator_name)){
	return true;
      }
    }
    return false;
  };

  episode.prototype.hasStoryTitleLike = function(title){
    var rex = new RegExp("/(.*?)(" + title + ")(.*)/");
    for (var i=0; i < this._story.length; i++){
      if (this._story[i].title === title || rex.test(this._story[i].title)){
	return true;
      }
    }
    return false;
  };

  episode.prototype.addStory = function(sdata){
    var s = null;
    if (typeof(sdata) === typeof({})){
      try {
	s = new story(sdata);
      } catch (e) {throw e;}
    } else if (sdata instanceof story){
      s = sdata;
    } else {
      throw new TypeError();
    }
    if (s !== null){
      s.on("changed", (function(){
	this.emit("changed");
      }).bind(this));
      this._story.push(s);
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

  episode.prototype.storiesByWriter = function(writer_name){
    var s = [];
    for (var i=0; i < this._story.length; i++){
      if (this._story[i].hasWriter(writer_name)){
	s.push(this._story[i]);
      }
    }
    return s;
  };

  episode.prototype.storiesByNarrator = function(narrator_name){
    var n = [];
    for (var i=0; i < this._story.length; i++){
      if (this._story[i].hasNarrator(narrator_name)){
	n.push(this._story[i]);
      }
    }
    return n;
  };

  episode.prototype.storyByTitle = function(title){
    var sindex = this.getStoryIndexByTitle(title);
    if (sindex >= 0){
      return this._story[sindex];
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
    } else if (typeof(time) === 'number'){
      time = Math.floor(time);
    } else {
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
	    if (this._story[i].beginningSec > st && (nsi === -1 || this._story[i].beginningSec < nst)){
	      nsi = i;
	      nst = this._story[i].beginningSec - 2; // Buffer two seconds.
	    }
	  }
	}

	if (nst > 0){
	  return nst;
	}

	// This may be the last episode... check to see if the audio duration value exceeds this story's beginning time.
	// NOTE: For "free" audio, duration may not extend to this episode.
	var edur = this.audio_durationSec;
	var sbeg = this._story[index].beginningSec;
	if (edur - sbeg > 5){ // Only count if there's more than 5 minutes left to the episode's audio from the beginning of this story.
	  return edur;
	}
      }
    }

    // This value means... we don't know.
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


  episode.prototype._CalculateEstimatedStoryEndTimes = function(){
    for (var i=0; i < this._story.length; i++){
      if (this._story[i].endingSec <= 0){
	var esec = this.estimateStoryEndTime(this._story[i]);
	if (esec > 0){
	  this._story[i].ending = Time.SecondsToHMS(esec);
	}
      }
    }
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

    "seasonEpisodeTitle":{
      get:function(){
	if (this._season > 0 && this._episode > 0){
	  return "Season " + this._season + " Episode " + ((this._episode < 10) ? "0" + this._episode : this._episode);
	}
	return "";
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

    "season":{
      get:function(){return this._season;}
    },

    "episode":{
      get:function(){return this._episode;}
    },

    "tagCount":{
      get:function(){return this._tag.length;}
    },

    "tags":{
      get:function(){return this._tag.join(", ");}
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

    "audio_duration":{
      get:function(){
	return this._audio_duration;
      },
      set:function(dur){
	if (typeof(dur) === 'number'){
	  Time.SecondsToHMS(Math.floor(dur));
	} else if (typeof(dur) === 'string'){
	  var seconds = Time.HMSToSeconds(dur);
	  if (seconds < 0){
	    throw new SyntaxError();
	  }
	  this._audio_duration = Time.SecondsToHMS(seconds);
	}
	this.emit("changed");
      }
    },

    "audio_durationSec":{
      get:function(){
	var seconds = Time.HMSToSeconds(this._audio_duration);
	return (seconds >= 0) ? seconds : 0;
      },
      set:function(dur){
	try {
	  this.audio_duration = dur;
	} catch (e) {throw e;}
      }
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
    },

    "img_filename":{
      get:function(){
	var url = this._img_src;
	//this removes the anchor at the end, if there is one
	url = url.substring(0, (url.indexOf("#") == -1) ? url.length : url.indexOf("#"));
	//this removes the query after the file name, if there is one
	url = url.substring(0, (url.indexOf("?") == -1) ? url.length : url.indexOf("?"));
	//this removes everything before the last slash in the path
	url = url.substring(url.lastIndexOf("/") + 1, url.length);
	return url;
      }
    }
  });

  return episode;
})();
