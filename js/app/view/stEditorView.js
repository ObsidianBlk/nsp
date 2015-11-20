
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
