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


module.exports = (function(){

  // complete_callback = function(episode, path_to_image); // path_to_image is an empty string if there is no image for the given episode.
  // error_callback = function(err);
  return function(episode, complete_callback, error_callback){
    // Just call the callback immediately for now!
    // TODO: Actually write out this module!
    complete_callback(episode, "");
  };
  
})();
