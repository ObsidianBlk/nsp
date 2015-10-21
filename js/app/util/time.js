
module.exports = {
  SecondsToHMS : function(sec){
    var h = Math.floor(sec/(60*60));
    sec -= (h*60*60);
    var m = Math.floor(sec/60);
    var s = sec - (m*60);

    h = ((h < 9) ? "0" : "") + parseInt(h);
    m = ((m < 9) ? "0" : "") + parseInt(m);
    s = ((s < 9) ? "0" : "") + parseInt(s);

    return h + ":" + m + ":" + s;
  },

  HMSToSeconds : function(dur){
    if (dur === ""){return 0;}

    var t = dur.split(":");
    if (t.length < 1 || t.length > 3){
      return -1;
    }

    var seconds = 0;
    t.reverse();
    for (var i=0; i < t.length; i++){
      var val = parseInt(t[i]);
      if (Number.isNaN(val)){
	return -1;
      }
      seconds += val*Math.pow(60, i);
    }
    return seconds;
  }
};
