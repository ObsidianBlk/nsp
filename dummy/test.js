var FS = require('fs');


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
	    writer:writer.trim(),
	    link:link
	  });
	}
      }
    }
  }

  return writers;
}


function FindNames(line){
  var name = "";
  var link = "";
  var conjunction = "";
  var r = /<a href="(.*?)"(.*?)>/i;

  var nlist = [];
  console.log("TESTING: " + line);
  
  var FindTagClosing = function(s, opos){
    var cpos = s.indexOf(">", opos+1);
    if (cpos >= 0){
      var nopos = s.indexOf("<", opos+1);
      if (nopos >= 0 && nopos < cpos){ // If there's another opening symbol... let's assume the closing symbol we have is that symbols match. Look again.
	cpos = FindTagClosing(s, cpos);
      }
    }
    return cpos;
  };

  for (var i=0; i < line.length; i++){
    var c = line[i];
    if (c === "," || c === "&"){
      if (name !== ""){
	nlist.push({
	  name:name.trim(),
	  link: (link !== "") ? link : null
	});
	name = "";
	link = "";
	conjunction = "";
      } 
    } else if (/\s/.test(c)){
      if (name !== ""){
	name += c;
      } else if (conjunction.toLowerCase() !== "and"){
	name += conjunction + c;
	conjunction = ""; // It wasn't a conjunction, so... must have been part of the name.
      } else {
	conjunction = ""; // Must have been the "and" conjunction.
      }
    } else if (c === "<"){
      var cpos = FindTagClosing(line, i);
      if (cpos >= 0){
	var s = line.substr(i, cpos-(i-1));
	var m = s.match(r);
	if (m !== null){
	  link = m[1];
	}
	i = cpos;
      } else {
	console.log("BYE! ... " + line.indexOf(">", i+1));
	break; // If we don't close the tag, then the we're done parsing as something is messed up.
      }
    } else if (c === "."){
      break; // Done!
    } else {
      if (name === "" && conjunction.length < 3){
	conjunction += c;
      } else {
	if (conjunction.length > 0){
	  name += conjunction;
	  conjunction = "";
	}
	name += c;
      }
    }
  }
  if (name !== ""){
    nlist.push({
      name:name.trim(),
      link: (link !== "") ? link : null
    });
  }

  return nlist;
}


function getNarrators(line){
  var narrators = [];

  var regNar = /(read by)(.*)/;
  var narMatch = line.match(regNar);
  var res = null;
  if (narMatch !== null && narMatch.length > 2){
    res = narMatch[2];
    if (res !== null){
      // Strip out "(Story"...
      var pos = res.indexOf("(Story");
      if (pos > 0){
	res = res.substr(0, pos);
      }
    }
  }

  if (res !== null){
    var list = FindNames(res);
    for (var i=0; i < list.length; i++){
      narrators.push({
	narrator:list[i].name,
	link:list[i].link
      });
    }
    /*var nar = null;
    var link = null;
    var rex = /(<a href=\\*\\*\"(.*?)\\*\\*\"(.*?)>(.*?)<\/a>(\s*)(, | & | and ){0,1})./;
    if (rex.test(res)){
      var item = null;
      while ((item = rex.exec(res)) !== null){
	nar = item[4];
	link = item[2];
	res = res.substr(item.index+item[0].length);
	narrators.push({
	  narrator:nar,
	  link:link
	});
      }
    } else {
      res = res.split(",");
      if (res.length > 0){
	for (var i=0; i < res.length; i++){
	  nar = res[i];
	  link = null;

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
	      narrator:nar.trim(),
	      link:link
	    });
	  }
	}
      }
    }*/
  }

  return narrators;
}


function getStoryBeginning(line){
  var regBeginning = /\d\d:\d\d:\d\d/;
  var beginningMatch = line.match(regBeginning);
  return (beginningMatch !== null && beginningMatch.length >= 1) ? beginningMatch[0] : null;
}



function run(data){
  var regLines = new RegExp("<p>(.*?)</p>");
  var regStories = new RegExp('<strong>"<a href="(.*?)">(.*?)</a>"</strong>');
  var regStoriesAlt = new RegExp('<strong>(.*?)</strong> written');
  var regAuthors = new RegExp('written by (.*?) and read');
  var lines = data.split(regLines);
  var desc = (lines.length > 1) ? lines[1] : "";
  var info = {shortdesc:desc, story:[]};
  for (var i=0; i < lines.length; i++){
    if (lines[i].match(regStories) !== null || lines[i].match(regStoriesAlt) !== null){
      var title = getTitle(lines[i]);
      if (title !== null){
	title.writer = getWriters(lines[i]);
	title.narrator = getNarrators(lines[i]);
        title.beginning = getStoryBeginning(lines[i]);
	console.log(title.narrator);
      }
      info.story.push(title);
    }
  }
}




FS.readFile("./test.txt", function(err, data){
  if (err){
    console.log(err);
  } else {
    run(data.toString());
  }
});


