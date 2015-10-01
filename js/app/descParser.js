
module.exports = (function(){
  function getTitle(line){
    var regLink = new RegExp("<a href=\"(.*?)\"(.*?)>");
    var linkMatch = line.match(regLink);
    var link = null;
    if (linkMatch !== null && linkMatch.length >= 1){
      link = linkMatch[1];
    }

    var regTitle = (link !== null) ? new RegExp('"(<a href="(.*?)"(.*?)>)(.*?)(</a>)"') : new RegExp('(>)(.*?)(</)(.*?)(written)');
    var titleMatch = line.match(regTitle);
    var title = null;
    if (titleMatch !== null && ((link !== null && titleMatch.length >= 4) || titleMatch.length >= 2)){
      title = titleMatch[(link !== null) ? 4 : 2];
    }

    return (title === null) ? null :{
      title:title,
      link:link
    };
  }


  function getWriters(line){
    var regWriters = new RegExp('(written by)(.*?)(and read)');
    var writersMatch = line.match(regWriters);
    var writers = [];
    if (writersMatch === null || writersMatch.length < 3){
      regWriters = /(written and read by)(.*?)\./;
      writersMatch = line.match(regWriters);
    }

    if (writersMatch !== null && writersMatch.length > 2){
      var res = writersMatch[2];
      res = res.split(",");
      if (res.length > 0){
        for (var i=0; i < res.length; i++){
	  var writer = res[i];
	  var link = null;

	  // Strip possible "(redditor)" tag...
	  var regReddit = /(.*?) (\([R|r]edditor(.*?)\))/;
	  var m = res[i].match(regReddit);
	  if (m !== null && m.length > 2){
	    writer = m[1]; // This should just be the writer's name.
	  }

	  // Find writer's link...
	  var regLink = new RegExp("<a href=\"(.*?)\"(.*?)>(.*?)</a>");
	  m = res[i].match(regLink);
	  if (m !== null && m.length > 3){
	    link = m[1]; // This should be a link to the writter's information.
	    writer = m[3]; // This should just be the writter's name.
	  }

	  // Remove any conjunctive "and" from the writter's name.
	  var regAnd = new RegExp("([A|a][N|n][D|d]) (.*?)");
	  m = writer.match(regAnd);
	  if (m !== null && m.length > 2){
	    writer = m[2];
	  }

	  if (writer !== null){
	    writers.push({
	      name:writer.trim(),
	      link:link
	    });
	  }
        }
      }
    }

    return writers;
  }


  function getNarrators(line){
    var narrators = [];
    //var pos = line.lastIndexOf("read by");
    //var res = null;
    //if (pos > 0){
    //  res = line.substr(pos+"read by".length);
    //}

    var regNar = /(read by)(.*?)(\.)/;
    var narMatch = line.match(regNar);
    var res = null;
    if (narMatch !== null && narMatch.length > 2){
      res = narMatch[2];
    }

    if (res !== null){
      res = res.split(",");
      if (res.length > 0){
        for (var i=0; i < res.length; i++){
	  var nar = res[i];
	  var link = null;

	  // Strip possible "(redditor)" tag...
	  var regReddit = /(.*?) (\([R|r]edditor(.*?)\))/;
	  var m = res[i].match(regReddit);
	  if (m !== null && m.length > 2){
	    nar = m[1]; // This should just be the narrator's name.
	  }

	  // Find narrator's link...
	  var regLink = new RegExp("<a href=\"(.*?)\"(.*?)>(.*?)</a>");
	  m = res[i].match(regLink);
	  if (m !== null && m.length > 3){
	    link = m[1]; // This should be a link to the narrator's information.
	    nar = m[3]; // This should just be the narrator's name.
	  }

          var regStripTime = /(.*?)\. \((.*?)\)/;
          var timeMatch = nar.match(regStripTime);
          if (timeMatch !== null && timeMatch.length > 2){
            nar = timeMatch[1];
          }

	  // Remove any conjunctive "and" from the writter's name.
	  var npos = nar.indexOf(" and ");
	  var len = 5;
	  if (npos < 0){
	    npos = nar.indexOf(" & ");
	    len = 3;
	  }
	  if (npos >= 0){
	    nar = nar.substr(npos+len);
	  }

	  if (nar !== null){
	    narrators.push({
	      name:nar.trim(),
	      link:link
	    });
	  }
        }
      }
    }

    return narrators;
  }


  function getStoryBeginning(line){
    var regBeginning = /\d\d:\d\d:\d\d/;
    var beginningMatch = line.match(regBeginning);
    return (beginningMatch !== null && beginningMatch.length >= 1) ? beginningMatch[0] : null;
  }



  return function(data){
    var regLines = new RegExp("<p>(.*?)</p>");
    var regStories = new RegExp('<strong>"<a href="(.*?)">(.*?)</a>"</strong>');
    var regStoriesAlt = new RegExp('<strong>(.*?)</strong> written');
    var regAuthors = new RegExp('written by (.*?) and read');
    var lines = data.split(regLines);
    var desc = {shortdesc:(lines.length > 1) ? lines[1] : "", story:[]};
    for (var i=0; i < lines.length; i++){
      if (lines[i].match(regStories) !== null || lines[i].match(regStoriesAlt) !== null){
        var title = getTitle(lines[i]);
        if (title !== null){
	  title.writer = getWriters(lines[i]);
	  title.narrator = getNarrators(lines[i]);
          title.beginning = getStoryBeginning(lines[i]);
          desc.story.push(title);
        }
      }
    }
    return desc;
  };
})();