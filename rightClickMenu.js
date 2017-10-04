/*
 * Menüü
 * 
 * Based on Zorin Menu: The official applications menu for Zorin OS by:
 * Copyright (C) 2017 Zorin OS
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. 
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 * Credits:
 * This file is based on code from the Dash to Dock extension by micheleg.
 * Some code was adapted from Configurable Menu by lestcape.
 */


const AppDisplay = imports.ui.appDisplay;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;


const PanelMenu = imports.ui.panelMenu;
const GnomeSession = imports.misc.gnomeSession;
const PopupMenu = imports.ui.popupMenu;
const AppFavorites = imports.ui.appFavorites;
const Main = imports.ui.main;



const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const cache_path = Menyy.path + "/cache/";
const ApplicationType = {
		APPLICATION: 0,
		PLACE: 1,
		RECENT: 2,
		TERMINAL:3
};




/**
 * Extend AppIconMenu
 *
 * - set popup arrow side based on taskbar orientation
 * - Add close windows option based on quitfromdash extension
 *   (https://github.com/deuill/shell-extension-quitfromdash)
 */

const AppItemMenu = new Lang.Class({
    Name: 'Menyy.AppItemMenu',
    Extends: AppDisplay.AppIconMenu,

    _init: function(source) {
    	this.source = source;
    	this.connect('activate', Lang.bind(this, this._onActivate));
        this.parent(source);
        this._button = this.source._button;
    },
    
    
    _addToDesktop: function() {
        //try {
        	let app = this.source.app;
        	let path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
        	let file;
        	let destFile;
        	let workItGirl;
        	let shortcut = true;
        	if (this.source._type == ApplicationType.APPLICATION) {
        		shortcut = false;
        		file = Gio.file_new_for_path(app.get_app_info().get_filename());
        		destFile = Gio.file_new_for_path(path + "/" + app.get_id());
        		global.log("menyy file: " + app.get_app_info().get_filename());
        	} else if (this.source._type == ApplicationType.RECENT) {
        		shortcut = false;
        		workItGirl = this.source._get_app_id(ApplicationType.RECENT).replace('file://','');
        		file = Gio.file_new_for_path(workItGirl);
        		destFile = Gio.file_new_for_path(path + "/" + this.source._get_app_id(ApplicationType.RECENT).replace(/^.*[\\\/]/, ''));
        		global.log("menyy file: " + this.source._get_app_id(ApplicationType.RECENT));
        	} else if (this.source._type == ApplicationType.PLACE) {
        		shortcut = true;
        		if (this.source.app.uri) {
        			workItGirl = this.source._get_app_id(ApplicationType.PLACE).replace('file://','');
            		file = Gio.file_new_for_path(workItGirl);
            		destFile = Gio.file_new_for_path(path + "/" + this.source.name);
            		global.log("menyy file: " + this.source._get_app_id(ApplicationType.PLACE));
        		} else if (this.source.app.file) {
            		file = this.source.app.file.get_path();
            		destFile = Gio.file_new_for_path(path + "/" + this.source.app.file.get_basename());
        		}
        	} else {
        		global.log("menyy: how have you managed to create a situation without a filetype and gotten so far???");
        	}
        	
        	//let app = this.source.app;
        	
            //let file = Gio.file_new_for_path(app.get_app_info().get_filename());
            //let path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
            //let destFile = Gio.file_new_for_path(path + "/" + app.get_id());
        	if (shortcut) {
        		//g_file_make_symbolic_link
        		global.log("menyy destFile: " + destFile);
        		//file.make_symbolic_link(destFile, null, function(){});
        		//file.make_symbolic_link(destFile, null);
        		destFile.make_symbolic_link(file,  null);
        	} else {
	            file.copy(destFile, 0, null, function(){});
	            // Need to find a way to do that using the Gio library, but modifying the access::can-execute attribute on the file object seems unsupported
	            Util.spawnCommandLine("chmod +x \"" + path + "/" + app.get_id() + "\"");
        	}
            return true;
        //} catch(e) {
        //    global.log(e);
        //}
        return false;
        
    },
    
    _onActivate: function (actor, child) {
        if (child._window) {
            let metaWindow = child._window;
            this.emit('activate-window', metaWindow);
        } else if (child == this._newWindowMenuItem) {
            this.source.app.open_new_window(-1);
            this.emit('activate-window', null);
        } else if (child == this._toggleFavoriteMenuItem) {
            let favs = AppFavorites.getAppFavorites();
            let isFavorite;
            if (this.source._type == ApplicationType.APPLICATION) {
        		isFavorite = favs.isFavorite(this.source.app.get_id());
            } else {
            	isFavorite = favs.isFavorite(this.source.app.app.get_id());
            	global.log("menyy isfav: " + isFavorite);
            }
            if (isFavorite)
            	if (this.source._type == ApplicationType.APPLICATION) {
            		favs.removeFavorite(this.source.app.get_id());
            	} else {
            		favs.removeFavorite(this.source.app.app.get_id());
            	}
            else
            	if (this.source._type == ApplicationType.APPLICATION) {
            		favs.addFavoriteAtPos(this.source.app.get_id(), -1);
            	} else {
                    let app = cache_path + this.source.app.app.get_id();
                    // TODO(copy the file to a proper location or monkeypatch to use custom folders)
            		favs.addFavorite(this.source.app.app.get_id());
            		
            	}
        }
        this.close();
        this._button._toggleMenu();
    },
    
    _activateApp: function() {
    	this.source.activate();
    },
    
    _createDefaultMenu: function(app) {
    	let windows =  app.get_windows();
        // Display the app windows menu items and the separator between windows
        // of the current desktop and other windows.
        let activeWorkspace = global.screen.get_active_workspace();
        let separatorShown = windows.length > 0 && windows[0].get_workspace() != activeWorkspace;

        for (let i = 0; i < windows.length; i++) {
            if (!separatorShown && windows[i].get_workspace() != activeWorkspace) {
                this._appendSeparator();
                separatorShown = true;
            }
            let item = this._appendMenuItem(windows[i].title);
            item._window = windows[i];
        }

        if (!app.is_window_backed()) {
            if (windows.length > 0)
                this._appendSeparator();

            let isFavorite = AppFavorites.getAppFavorites().isFavorite(app.get_id());

            //this._newWindowMenuItem = this._appendMenuItem(_("New Window"));
            //this._appendSeparator();

            this._toggleFavoriteMenuItem = this._appendMenuItem(isFavorite ? _("Remove from Favorites") : _("Add to Favorites"));
        }
    },
    
    _redisplay: function() {
    	this.removeAll();
    	
    	//Add an open button to all apps!
    	this._activateAppItem = this._appendMenuItem("Open");
        this._activateAppItem.connect('activate', Lang.bind(this, function() {
            this._activateApp();
        }));
    	
    	
    	
    	//TODO(Add an open with button to all apps!)
    	
        
        
        let app;
        let path;
        let file;
    	
        if (this.source._type == ApplicationType.APPLICATION) {
        	app = this.source.app;
        	//global.log("menyy -> normal app -> " + app);
        	path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
        	file = Gio.file_new_for_path(path + "/" + this.source._get_app_id(ApplicationType.APPLICATION));
        	this.parent();
    	}  else if (this.source._type == ApplicationType.TERMINAL) {
        	app = this.source.app.app;
			path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
    		//file = Gio.file_new_for_path(path + "/" + this.source._get_app_id(ApplicationType.RECENT).replace(/^.*[\\\/]/, ''));
    		
    		//this._createDefaultMenu(app);		
    	} else if (this.source._type == ApplicationType.RECENT) {
        	app = this.source.app;
			path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
    		file = Gio.file_new_for_path(path + "/" + this.source._get_app_id(ApplicationType.RECENT).replace(/^.*[\\\/]/, ''));
    		
    		//this._createDefaultMenu();   		
    	} else if (this.source._type == ApplicationType.PLACE) {
    		app = this.source.app;
			path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
			
			
			// A hack until I Web Bookmarks as a different type
    		if (!this.source.app.app) {
    			file = Gio.file_new_for_path(path + "/" + this.source.app.file.get_basename());
    		}
    	} else {
    		global.log("menyy: how have you managed to create a situation without a filetype?");
    	}
    	
    	// TODO(REPLACE HACK dealing with empty menus)
    	if ((this.source._type == ApplicationType.APPLICATION) || (this.source._type == ApplicationType.RECENT)) {
            if (!file.query_exists(null)){
                this._appendSeparator();
                this._addToDesktopItem = this._appendMenuItem("Add to Desktop");
                this._addToDesktopItem.connect('activate', Lang.bind(this, function() {
                    this._addToDesktop();
                }));
            } /*else if (this.source._type == ApplicationType.RECENT) {
                this._appendSeparator();
                this._addToDesktopItem = this._appendMenuItem("Remove from Desktop (unimplemented)");
            }*/
        } else if ((this.source._type == ApplicationType.PLACE) && !(this.source.app.app)) {
        	if (!file.query_exists(null)) {
	            this._appendSeparator();
	            this._addToDesktopItem = this._appendMenuItem("Shortcut to Desktop");
	            this._addToDesktopItem.connect('activate', Lang.bind(this, function() {
	                this._addToDesktop();
	            }));
        	}
        }
    }
});
