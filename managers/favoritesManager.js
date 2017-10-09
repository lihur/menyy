const favoritesManager = new Lang.Class({
	Name: 'Menyy.FavoritesManager',
	
	_init: function() {
		this.favoritesPath = 
    },
    
    // If no directory exists, create one
    _setupDirectory: function() {
        let dir = Gio.file_new_for_path(this.favoritesPath);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }
        this._appDirectory = dir;
    },
    
    _addToFavorites: function(app) {
    	
    },
    
    _loadFavorites: function() {
    	
    },
    
    getFavorites: function(pattern) {
		this._loadFavorites(pattern);
		return this._favorites;
    }
    
    
});
