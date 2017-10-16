const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const St = imports.gi.St;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;
const Atk = imports.gi.Atk;
const appSys = Shell.AppSystem.get_default();

//const PanelMenu = imports.ui.panelMenu;
//const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const FileUtils = imports.misc.fileUtils;
const Util = imports.misc.util;


const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const favorites_path = Menyy.path + "/favorites";







//Convert array to object
const arrayToObject = function(array){
    var thisEleObj = new Object();
    if(typeof array == "object"){
        for(var i in array){
        	//global.log("menyy object: " + array);
            var thisEle = arrayToObject(array[i]);
            thisEleObj[i] = thisEle;
        }
    }else {
    	//global.log("menyy non-object: " + array);
        thisEleObj = array;
    }
    return thisEleObj;
}










const favoritesManager = new Lang.Class({
	Name: 'Menyy.FavoritesManager',
	
	_init: function() {		
		this._favorites = [];
		//this._favoritesOrdered = [];
		//this._setupDirectory();
        //this._setupDirectoryMonitor();
        //this.connect('destroy', Lang.bind(this, this._onDestroy));
    },
    
    // Sets up the favorites directory (or creates if it doesn't exist)
    _setupDirectory: function() {
        let dir = Gio.file_new_for_path(favorites_path);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }
        this._appDirectory = dir;
    },
    
    // Sets up ordered favorites file (or creates if it doesn't exsist)
    _setupFile: function() {
    	/*
    	let file Gio.File.new_for_path(GLib.build_filenamev([favorites_path, 'favorites.json']));
        if (!file.query_exists(null)) {
            //dir.make_directory_with_parents(null);
        	file.create(Gio.FileCreateFlags.NONE, null);
        }
        */
        // reads file
        
    },
    
    
    // reload favorites
    reload: function() {
    	this._favorites = [];
        this._loadFavorites();
    },
    
    // directory monitor
    _setupDirectoryMonitor: function() {
        if (!this._appDirectory.query_exists(null))
            return;
        this._monitor = this._appDirectory.monitor_directory(Gio.FileMonitorFlags.NONE, null);
        this._appDirectoryTimeoutId = 0;
        this._monitor.connect('changed', Lang.bind(this, function () {
            if (this._appDirectoryTimeoutId > 0)
                return;
            /* Defensive event compression */
            this._appDirectoryTimeoutId = Mainloop.timeout_add(100, Lang.bind(this, function () {
                this._appDirectoryTimeoutId = 0;
                this.reload();
                return false;
            }));
        }));
    },
    
    _onFavsChanged: function() {
        this.reload();
        this.emit('changed');
    },
    
    isFavorite: function(desktopFile) {
		let file = Gio.File.new_for_path(GLib.build_filenamev([favorites_path, desktopFile]));
		return (file.query_exists(null));
    },
    
    _addFavorite: function(desktopFile, pos) {
    	
    },
    
    addFavorite: function(desktopFile) {
    	this._addFavorite(desktopFile, -1);
    },
    
    removeFavorite: function(desktopFile) {
    	
    	
    	
    	
    	Main.overview.setMessage(_("%s has been removed from your favorites.").format(app.get_name()),
			{ forFeedback: true,
			  undoCallback: Lang.bind(this, function () {
			                              this._addFavorite(appId, pos);
			                          })
		});
    },
    
    
    moveFavoriteToPos: function(app, pos) {
    	
    },
    
    
    
    _loadFavorites: function() {
    	this._favorites = [];
    	let _appsDir = Gio.file_new_for_path(favorites_path);
        if (!_appsDir.query_exists(null)) {
            global.log('Favorites path ' + favorites_path + ' could not be opened!');
            return;
        }

        let fileEnum;
        let file, info;
        let i = 0;
        try {
            fileEnum = _appsDir.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null);
        } catch (e) {
            global.logError('' + e);
            return;
        }

        // add menu entry for each file
        while ((info = fileEnum.next_file(null)) != null) {
            let fileType = info.get_file_type();
            if (fileType == Gio.FileType.DIRECTORY)
                continue;
            let name = info.get_name();
            if( name.indexOf('.desktop') > -1) {
                let desktopPath =  GLib.build_filenamev([favorites_path, name]);
                let appInfo = Gio.DesktopAppInfo.new_from_filename(desktopPath);
                if (!appInfo) {
                    global.log('App for desktop file ' + desktopPath + ' could not be loaded!');
                    //TODO(GIVE WARNING POPUP WITH A DELETE BUTTON OPTION)
                    //return null;
                }

                let app;
                // if it's a registered application, get it from appsystem, so it has the right right-click menu and indicator
				try {
					app = appSys.lookup_app(info.get_name());
				} catch(e) {
					global.log("menyy app id error " + e);
				}
                // if it didn't succeesd getting the app from appsystem, create a new shell app
				if (!app) {
					app = new Shell.App({ app_info: appInfo});
				}
				
                
                this._favorites.push(app);
                this._favoritesOrdered.push(name);
                i++;
            } else if (name != 'favorites.json') {
            	global.log("menyy wrong file: " + name);
            	//TODO(GIVE WARNING POPUP WITH A DELETE BUTTON OPTION)
            }
        }
        fileEnum.close(null);    	
    },
    
    getFavorites: function() {
		this._loadFavorites();
		global.log("menyy favorites " +JSON.stringify(arrayToObject(this._favoritesOrdered)));
		
		
		return this._favorites;
    },
    
    _onDestroy: function() {
        this._monitor.cancel();
        Mainloop.source_remove(this._appDirectoryTimeoutId);
    }
});
