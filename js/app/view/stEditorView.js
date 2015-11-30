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


if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.StEditorView = (function(){

  var Events = require('events');

  function stEditorView(id){
    this._modal = $(id);
    this._ConfigureButtons();
  };
  stEditorView.prototype.__proto__ = Events.EventEmitter.prototype;
  stEditorView.prototype.constructor = stEditorView;


  stEditorView.prototype._ConfigureButtons = function(){
    ;
  };

  return stEditorView;
})();
