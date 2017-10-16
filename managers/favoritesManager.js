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
var _favoritesFile = null;
var _favoritesMonitor = null;
var _callbackId = null;

var favorites = [];
var favoritesAsApps = [];





//Convert array to object
const arrayToObject = function(array){
    var thisEleObj = new Object();
    if(typeof array == "object"){
        for(var i in array){
            var thisEle = arrayToObject(array[i]);
            thisEleObj[i] = thisEle;
        }
    }else {
        thisEleObj = array;
    }
    return thisEleObj;
}

const favoritesManager = new Lang.Class({
	Name: 'Menyy.FavoritesManager',
	
	_init: function() {
		favorites = [];
		favoritesAsApps = [];
		this._setupFavsFile();
    },
    
    
    _saveToFile: function() {
    	const contents = JSON.stringify(arrayToObject(favorites));
		if (!contents)
			return false;
		try {
			{
				if (_favoritesFile.query_exists (null)) {
					_favoritesFile.delete(null);
				}
				let dos = _favoritesFile.create(Gio.FileCreateFlags.NONE, null);
				dos.write(contents, null, contents.length);
			} // Streams closed at this point
		} catch (e) {
			Main.notifyError(_("Failed to edit favorites file for \"%s\"").format(desktopFile), e.message);
		}
    },
    
    
    // reload favorites
    reload: function() {
        this._loadFavorites();
    },
    
    _onFavsChanged: function() {
        this.reload();
        //this.emit('changed');
    },    
    
    _setupFavsFile() {
        _favoritesFile = Gio.File.new_for_path(GLib.build_filenamev([Menyy.path, 'favorites.json']));
		if (! _favoritesFile.query_exists(null)) {
			// TODO(CREATE AN EMPTY FILE)
		    _reset();
		    return;
		}
		
		_favoritesMonitor = _favoritesFile.monitor_file( Gio.FileMonitorFlags.NONE, null);
		_callbackId = _favoritesMonitor.connect('changed', Lang.bind(this, this._onFavsChanged));
		this._loadFavorites();
    },
    
    isFavorite: function(desktopFile) {
    	return favorites.indexOf(desktopFile) > -1;
    },
    
    _addFavorite: function(desktopFile, pos) {
    	// Add to list at position and save an updated json
    	if (pos > -1) {
    		favorites.splice(pos, 0, desktopFile);
    	} else {
    		favorites.push(desktopFile);
    	}
    	
    	this._saveToFile();
    	
    	
    	Main.overview.setMessage(_("%s has been added from your favorites.").format(desktopFile),
    			{ forFeedback: true,
    			  undoCallback: Lang.bind(this, function () {
    			                              this.removeFavorite(desktopFile);
    			                          })
    		});
    },
    
    addFavorite: function(desktopFile) {
    	this._addFavorite(desktopFile, -1);
    },
    
    removeFavorite: function(desktopFile) {
    	// remove from list
    	const pos = favorites.indexOf(desktopFile);
    	favorites.splice(pos, 1);
    	//favoritesAsApps.splice(pos, 1);
    	
    	// save to new json file
    	this._saveToFile();
    	
    	
    	
    	Main.overview.setMessage(_("%s has been removed from your favorites.").format(desktopFile),
			{ forFeedback: true,
			  undoCallback: Lang.bind(this, function () {
			                              this._addFavorite(desktopFile, pos);
			                          })
		});
    },
    
    
    moveFavoriteToPos: function(desktopFile, pos) {
    	// edit the list and save to json
    	const oldPos = favorites.indexOf(desktopFile);
    	favorites.splice(pos, 0, favorites.splice(oldPos, 1)[0]);
    	this._saveToFile();
    },
    
    
    
    _loadFavorites: function() {
    	favorites = [];
    	favoritesAsApps = [];
    	
    	let content;
        let jsonResult;
        let size;
        let success;

        try {
            [success, content, size] = _favoritesFile.load_contents(null);
        } catch(e) {
            log("ERROR: " + e.message);
            return;
        }

        if (! success) {
            return;
        }

        try {
            jsonResult = JSON.parse(content);
        } catch(e) {
            log("ERROR: " + e.message);
            return;
        }
        
        for (var line in jsonResult) {
        	// To make saving to json easyer
        	favorites.push(jsonResult[line]);
        	
        	// Actual favorites list that's used
        	const app = appSys.lookup_app(jsonResult[line]);
        	favoritesAsApps.push(app);
        }
    	
    },
    
    getFavorites: function() {
		this._loadFavorites();
		return favoritesAsApps;
    },
    
    _onDestroy: function() {
        //this._monitor.cancel();
        //Mainloop.source_remove(this._appDirectoryTimeoutId);
    }
});
