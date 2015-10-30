
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.FilterView = (function(){

  var Events = require('events');
  var FS = require('fs');
  var Path = require('path');

  var templates = {
    filterItem: FS.readFileSync("templates/filterItem.html").toString()
  };


  function filterView(id){
    this._modal = $(id);
    this._modal.find(".filter-clear-action").on("click", (function(){
      this._modal.find(".filter-item").remove();
      this._AddNewFilterOption();
    }).bind(this));

    this._modal.find(".filter-apply-action").on("click", (function(){
      var filters = this._CompileFilters();
      if (this.open){
	this.close();
      }
      this.emit("apply", filters);
    }).bind(this));

    this._modal.find(".filter-close-action").on("click", (function(){
      this._modal.find(".filter-item").remove();
      if (this.open){
	this._modal.closeModal();
      }
    }).bind(this));

    this._modal.find(".filter-add-action").on("click", (function(){
      this._AddNewFilterOption();
    }).bind(this));
  }
  filterView.prototype.__proto__ = Events.EventEmitter.prototype;
  filterView.prototype.constructor = filterView;

  filterView.prototype.openModal = function(filters){
    if (this.open === false){
      this._modal.find(".filter-item").remove();
      if (filters instanceof Array){
	for (var i=0; i < filters.length; i++){
	  var item = $(templates.filterItem);
	  item.find(".filter-type select option[value=\"" + filters[i].type + "\"]").prop("selected", true);
	  if (filters[i].type === "tag" || filters[i].type === "story"){
	    item.find(".filter-value-tag").removeAttr("style");
	    item.find(".filter-value-person").css("display", "none");
	    item.find(".filter-value-tag input").val(filters[i].value); // <-- value
	    if (filters[i].type === "tag"){
	      item.find(".filter-value-tag input").attr("placeholder", "Comma seperated tag list");
	    } else if (filters[i].type === "story"){
	      item.find(".filter-value-tag input").attr("placeholder", "Enter (partial) story title");
	    }
	  } else if (filters[i].type === "writer" || filters[i].type === "narrator"){
	    var persons = [];
	    var e = 0;
	    if (filters[i].type === "writer"){
	      for (e=0; e < NSP.db.episodeCount; e++){
		NSP.db.episode(e).writers(persons);
	      }
	    } else if (filters[i].type === "narrator"){
	      for (e=0; e < NSP.db.episodeCount; e++){
		NSP.db.episode(e).narrators(persons);
	      }
	    }
	    item.find(".filter-value-person select").empty();
	    item.find(".filter-value-person select").append($("<option value=\"\" disabled selected>Select " + filters[i].type + "</option>"));
	    for (e=0; e < persons.length; e++){
	      item.find(".filter-value-person select").append($("<option value=\"" + persons[e].name + "\">" + persons[e].name + "</option>"));
	    }
	    item.find(".filter-value-person").removeAttr("style");
	    item.find(".filter-value-tag").css("display", "none");
	    item.find(".filter-value-person").find("option[value=\"" + filters[i].value + "\"]").prop("selected", true); // <-- value
	  }
	  this._AddNewFilterOption(item);
	}
      }
      this._AddNewFilterOption();
      this._modal.openModal();
    }
  };

  filterView.prototype.close = function(){
    if (this.open){
      this._modal.closeModal();
    }
  };

  filterView.prototype._CompileFilters = function(){
    var filters = [];
    var items = this._modal.find(".filter-item");
    if (items.length > 0){
      for (var i=0; i < items.length; i++){
	var item = $(items[i]);
	var type = item.find(".filter-type select option:selected").val();
	var val = "";
	if (type === "tag" || type === "story"){
	  val = item.find(".filter-value-tag input").val();
	} else if (type === "writer" || type === "narrator"){
	  val = item.find(".filter-value-person select option:selected").val();
	}
	if (type !== "" && val !== ""){
	  filters.push({
	    type:type,
	    value:val
	  });
	}
      }
    }
    return filters;
  };

  filterView.prototype._AddNewFilterOption = function(item){
    if (typeof(item) === 'undefined'){
      item = $(templates.filterItem);
    }

    var actRemoveFilter = item.find(".filter-item-action");
    var filterType = item.find(".filter-type select");
    var valInput = item.find(".filter-value-tag");
    var selectInput = item.find(".filter-value-person");

    actRemoveFilter.on("click", function(){
      item.remove();
    });

    filterType.on("change", (function(){
      var type = filterType.find("option:selected").val();
      if (type === "tag" || type === "story"){
	valInput.find("input").val("");
	if (type === "tag"){
	  valInput.find("input").attr("placeholder", "Comma seperated tag list");
	} else if (type === "story"){
	  valInput.find("input").attr("placeholder", "Enter (partial) story title");
	}
	valInput.removeAttr("style");
	selectInput.css("display", "none");
      } else if (type === "writer" || type === "narrator"){
	var persons = [];
	var e = 0;
	if (type === "writer"){
	  for (e=0; e < NSP.db.episodeCount; e++){
	    NSP.db.episode(e).writers(persons);
	  }
	} else if (type === "narrator"){
	  for (e=0; e < NSP.db.episodeCount; e++){
	    NSP.db.episode(e).narrators(persons);
	  }
	}
	selectInput.find("select").empty();
	selectInput.find("select").append($("<option value=\"\" disabled selected>Select " + type + "</option>"));
	for (e=0; e < persons.length; e++){
	  selectInput.find("select").append($("<option value=\"" + persons[e].name + "\">" + persons[e].name + "</option>"));
	}

	selectInput.removeAttr("style");
	valInput.css("display", "none");
	$('select').material_select();
      }
    }).bind(this));
    item.insertBefore(this._modal.find(".filter-actions-box"));
    $('select').material_select();
  };

  Object.defineProperties(filterView.prototype, {
    "open":{
      get:function(){
	return this._modal.css("display") !== "none";
      }
    }
  });

  return filterView;
})();
