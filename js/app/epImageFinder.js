

module.exports = (function(){

  // complete_callback = function(episode, path_to_image); // path_to_image is an empty string if there is no image for the given episode.
  // error_callback = function(err);
  return function(episode, complete_callback, error_callback){
    // Just call the callback immediately for now!
    // TODO: Actually write out this module!
    complete_callback(episode, "");
  };
  
})();
