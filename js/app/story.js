

module.exports = (function(){

  var Events = require("events");
  

  function story(){

  };
  story.prototype.__proto__ = Events.EventEmitter.prototype;
  story.prototype.constructor = story;

  return story;
})();
