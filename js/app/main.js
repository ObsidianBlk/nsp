

$(document).ready(function(){
  require('nw.gui').Window.get().showDevTools();

  var app = new Application();
  app.on("database_created", function(){
    NSP.db.on("episode_added", function(ep){
      EpisodeCard(ep);
    });
  });
  app.run();
});
