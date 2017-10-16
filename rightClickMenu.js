const AppDisplay = imports.ui.appDisplay;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Clutter = imports.gi.Clutter;



const PanelMenu = imports.ui.panelMenu;
const GnomeSession = imports.misc.gnomeSession;
const PopupMenu = imports.ui.popupMenu;
const AppFavorites = imports.ui.appFavorites;
const Main = imports.ui.main;
const Signals = imports.signals;
const St = imports.gi.St;

// FOR COPY COMMANDS
const Clipboard = St.Clipboard.get_default();



const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const cache_path = Menyy.path + "/cache/";
const shell_path     = Menyy.path + "/bash_scripts";
const favoritesManager = Menyy.imports.managers.favoritesManager;


const constants = Menyy.imports.constants;
const AppType = constants.AppType;


let discreteGpuAvailable = false;


/*
 *  Create a new popupmenu that could later be adapted to be a generic popupmenu that has a hierarchy!
 *  (menus within menus like a normal GUI would do it!!!)
 */
const openWithSubMenu = new Lang.Class({
	Name: 'Menyy.openWithSubMenu',
	//Extends: AppDisplay.AppIconMenu,
	//Extends PopupMenu.PopupSubMenu,
	Extends: PopupMenu.PopupMenu,

	_init: function(source) {
		let side = St.Side.LEFT;
        if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL)
            side = St.Side.RIGHT;

        this.parent(source.actor, 0.5, side);

        // We want to keep the item hovered while the menu is up
        //this.blockSourceEvents = true;

        this._source = source;

        this.actor.add_style_class_name('app-well-menu');

        // Chain our visibility and lifecycle to that of the source
        source.actor.connect('notify::mapped', Lang.bind(this, function () {
            if (!source.actor.mapped)
                this.close();
        }));
        source.actor.connect('destroy', Lang.bind(this, this.destroy));

        Main.uiGroup.add_actor(this.actor);
        
		this.connect('activate', Lang.bind(this, this._onActivate));
		this._button = this._source._button;		
	},
	
	
	_appendSeparator: function () {
        let separator = new PopupMenu.PopupSeparatorMenuItem();
        this.addMenuItem(separator);
    },

    _appendMenuItem: function(labelText) {
        // FIXME: app-well-menu-item style
        let item = new PopupMenu.PopupMenuItem(labelText);
        this.addMenuItem(item);
        return item;
    },

    popup: function(activatingButton) {
        this._redisplay();
        this.open();
    },
	
	
	
	_onActivate: function (actor, child) {
		if (child._window) {
			let metaWindow = child._window;
			this.emit('activate-window', metaWindow);
		} else if (child == this._newWindowMenuItem) {
			this._source.app.open_new_window(-1);
			this.emit('activate-window', null);
		}
		this.close();
		this._source.close();
		//this._button._toggleMenu();
	},
	
	
	
	_redisplay: function() {
		this.removeAll();
		this._openWithItem = this._appendMenuItem("Default");
		this._openWithItem.connect('activate', Lang.bind(this, function() {
			Gio.app_info_launch_default_for_uri(this._source._source.app.uri, global.create_app_launch_context(0, -1));
		}));
		const list = Gio.app_info_get_all_for_type (this._source._source.app.mime);
		let launchers = [];
		for (var i in list) {
			launchers.push(this._appendMenuItem(list[i].get_name()));
			launchers[i].connect('activate', Lang.bind(this, function(launcher) {
				for (var i in list) {
					if (launcher.label.get_text() == list[i].get_name()) {
						(list[i]).launch_uris([this._source._source.app.uri], null);
					}
				}
			}))
		}
	}	
});
Signals.addSignalMethods(openWithSubMenu.prototype);




const AppItemMenu = new Lang.Class({
	Name: 'Menyy.AppItemMenu',
	Extends: AppDisplay.AppIconMenu,

	_init: function(source) {
		this._source = source;
		this.connect('activate', Lang.bind(this, this._onActivate));
		this.parent(source);
		this._button = this._source._button;
		this._menuManager = new PopupMenu.PopupMenuManager(this);
		
		
		if (favoritesManager) {																// if favoritesManager is imported
			if (!this.favoritesManager) 													// if the manager is not yet present
				this.favoritesManager = new favoritesManager.favoritesManager();			// create manager
		} else {																			// if no commandlinedisplay imported
			this.favoritesManager = null;													// then just ignore this part completely
		};
		
	},
	_onActivate: function (actor, child) {
		if (child._window) {
			let metaWindow = child._window;
			this.emit('activate-window', metaWindow);
			
			
			this.close();
			this._button._toggleMenu();
		} else if (child == this._newWindowMenuItem) {
			this._source.app.open_new_window(-1);
			this.emit('activate-window', null);
			
			
			this.close();
			this._button._toggleMenu();
		} else if (child == this._openWithSubMenu){
			// (TEMPORARILY) RELEASE THE GRABHELPER HERE SOMEHOW
			// OR PUSH THE SUBMENU IN FRONT?	
		} else if (child == this._toggleFavoriteMenuItem) {
			let favs = AppFavorites.getAppFavorites();
			let isFavorite;
			if (this._source._type == AppType.APPLICATION) {
				isFavorite = favs.isFavorite(this._source.app.get_id());
			} else {
				isFavorite = favs.isFavorite(this._source.app.app.get_id());
				global.log("menyy isfav: " + isFavorite);
			}
			if (isFavorite)
				if (this._source._type == AppType.APPLICATION) {
					favs.removeFavorite(this._source.app.get_id());
				} else {
					favs.removeFavorite(this._source.app.app.get_id());
				}
			else
				if (this._source._type == AppType.APPLICATION) {
					favs.addFavoriteAtPos(this._source.app.get_id(), -1);
				} else {
					let app = cache_path + this._source.app.app.get_id();
					// TODO(copy the file to a proper location or monkeypatch to use custom folders)
					// .local/share/applications
					favs.addFavorite(this._source.app.app.get_id());
					
				}
			this.close();
			this._button._toggleMenu();
		} else {
			// if something's clicked, close the menu
			this.close();
			this._button._toggleMenu();
		}
	},
	
	_activateApp: function() {
		this._source.activate();
	},
	
	
	_openWithSubMenu: function() {
			if (!this._menu) {
				this._menu = new openWithSubMenu(this);
				let id = Main.overview.connect('hiding', Lang.bind(this, function () {
				}));
				this.actor.connect('destroy', function() {
					Main.overview.disconnect(id);
				});
				this._menuManager.addMenu(this._menu);
			}
			this.emit('menu-state-changed', true);
			this.actor.set_hover(true);
			this._menu.popup();
			
			
			let metaWindow = child._window;
			this.emit('activate-window', metaWindow);
			return false;
	},
	
	_openWithSubMenuTerminal: function() {
		if (this._source._type == AppType.TERMINAL) {
			this.command = "gnome-terminal --execute " + this._source.app.command;
			Util.spawnCommandLine(this.command);
		} //else {
			//this.command = "gnome-terminal --execute " + (this._source.app.get_app_info().get_name()).toLowerCase();
			//Util.spawnCommandLine(this.command);
		//}
	},
	
	
	//TODO(FIGURE OUT WHY QT APPS WORK, BUT GTK APPS DON'T)
	_copyFile: function() {
		let uri;
		let argv;
		if (this._source._type == AppType.TERMINAL) {
			//TODO(REPLACE WITH CACHE FILE, AS IT'S ACTUALLY MORE USEFUL THIS WAY)
			uri = "file://" + this._source.app.location;
		} else if (this._source._type == AppType.FILE) {
			uri = this._source.app.uri;
		} else if (this._source._type == AppType.FOLDER) {
			uri = this._source.app.uri;
		} else if (this._source._type == AppType.WEBBOOKMARK) {
			uri = this._source.app.uri;
		} else if (this._source._type == AppType.PLACE) {
			uri = this._source.app.file.get_uri();
		} else {
			uri = "unknown location";
		}
		
		// NEITHER OF THOSE WORK, EVEN THOUGH THEY SHOULD!
		//argv = "echo " + uri + " | xclip -i -selection clipboard -t text/uri-list";
		//argv = "xclip -i -selection clipboard -t text/uri-list <<< " + uri;
		argv = shell_path + "/xclipper.sh " + uri;
		
		try {
			global.log("menyy file copy command: " + argv);
			Util.spawnCommandLine(argv);
			//Main.notifyError(_("Copied to selection clipboard via xclipboard"));
		} catch(e) {
			Main.notifyError(_("Failed to copy to clipboard \"%s\"").format(this.name), e.message);
		}
		
		
		//echo file:///path/to/file.extension | xclip -i -selection clipboard -t text/uri-list
		
	},
	
	_copyFileContents: function() {
		let argv = "xclip -selection clipboard";
		let uri;
		let mime;
		if (this._source._type == AppType.FILE) {
			mime = this._source.app.mime;
			uri = (this._source.app.uri).substring(7);
		} else {
			uri = "unknown location";
		}		
		try {
			Util.spawnCommandLine(argv + ' -t ' + mime + ' ' + uri);
			Main.notifyError(_("Copied to selection clipboard via xclipboard"));
		} catch(e) {
			Main.notifyError(_("Failed to copy to clipboard \"%s\"").format(this.name), e.message);
		}
		
	},
	_copyUri: function() {
		let uri;
		if (this._source._type == AppType.TERMINAL) {
			uri = "file://" + this._source.app.location;
		} else if (this._source._type == AppType.FILE){
			uri = this._source.app.uri;
			//global.log("menyy file uri " + uri);
		} else if (this._source._type == AppType.FOLDER) {
			uri = this._source.app.uri;
			//global.log("menyy folder uri " + uri);
		} else if (this._source._type == AppType.WEBBOOKMARK) {
			uri = this._source.app.uri;
		} else if (this._source._type == AppType.PLACE) {
			uri = this._source.app.file.get_uri();
		} else {
			uri = "unknown location";
		}
		Clipboard.set_text(St.ClipboardType.PRIMARY, uri);
	},
	
	_redisplay: function() {
		this.removeAll();
		
		// the right click options per apptype
		if (this._source._type == AppType.FILE) {
			/* Open Commands */
			// Open file with default Application
			this._activateAppItem = this._appendMenuItem("Open");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._activateApp();
			}));
			
			// Open file with other supported applications
			this._openWithItem = this._appendMenuItem("Open With...");
			this._openWithItem.connect('activate', Lang.bind(this, function() {
				this._openWithSubMenu();
			}));
			
			this._appendSeparator();
			
			
			
			/* Copy Commands */
			// Copy File (as urilist)
			this._activateAppItem = this._appendMenuItem("Copy file");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyFile();
			}));
			
			// Copy file contents
			this._activateAppItem = this._appendMenuItem("Copy contents");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyFileContents();
			}));
			
			// Copy file uri as text
			this._activateAppItem = this._appendMenuItem("Copy location");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyUri();
			}));
		} else if (this._source._type == AppType.FOLDER) {
			/* Open Commands */
			// Open folder with default Application
			this._activateAppItem = this._appendMenuItem("Open");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._activateApp();
			}));
			
			// Open folder with other supported applications
			this._openWithItem = this._appendMenuItem("Open With...");
			this._openWithItem.connect('activate', Lang.bind(this, function() {
				this._openWithSubMenu();
			}));
			
			this._appendSeparator();
			
			
			
			/* Copy Commands */
			// Copy folder (as urilist)
			this._activateAppItem = this._appendMenuItem("Copy file");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyFile();
			}));
			
			// Copy folder uri as text
			this._activateAppItem = this._appendMenuItem("Copy location");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyUri();
			}));
		} else if (this._source._type == AppType.PLACE) {
			/* Open Commands */
			// Open folder with default Application
			this._activateAppItem = this._appendMenuItem("Open");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._activateApp();
			}));
			this._appendSeparator();
			
			
			
			/* Copy Commands */
			// Copy folder (as urilist)
			this._activateAppItem = this._appendMenuItem("Copy file");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyFile();
			}));
			
			// Copy folder uri as text
			this._activateAppItem = this._appendMenuItem("Copy location");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyUri();
			}));
		} else if (this._source._type == AppType.WEBBOOKMARK) {
			/* Open Commands */
			// Open file with default Application
			this._activateAppItem = this._appendMenuItem("Open");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._activateApp();
			}));
			
			// Open file with other supported applications
			this._openWithItem = this._appendMenuItem("Open With...");
			this._openWithItem.connect('activate', Lang.bind(this, function() {
				this._openWithSubMenu();
			}));
			
			this._appendSeparator();

			// Copy file uri as text
			this._activateAppItem = this._appendMenuItem("Copy location");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyUri();
			}));			
		} else if (this._source._type == AppType.TERMINAL) {
			/* Open Commands */
			// Open folder with default Application
			this._activateAppItem = this._appendMenuItem("Open");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._activateApp();
			}));
			
			this._openWithItem = this._appendMenuItem("Open In Terminal");
			this._openWithItem.connect('activate', Lang.bind(this, function() {
				this._openWithSubMenuTerminal();
			}));
			
			this._appendSeparator();
			
			/* Add to Favorites */
			// Add to Local Favorites
            this._appendSeparator();
            let isFavorite = this.favoritesManager.isFavorite(this._source.app.app.get_id());
            if (isFavorite) {
                let item = this._appendMenuItem(_("Remove from Favorites"));
                item.connect('activate', Lang.bind(this, function() {
                    this.favoritesManager.removeFavorite(this._source.app.app.get_id());
                }));
            } else {
                let item = this._appendMenuItem(_("Add to Favorites"));
                item.connect('activate', Lang.bind(this, function() {
                	// Copies the desktop file to "/home/.local/share/applications"
                	let fileUri = GLib.build_filenamev([cache_path, this._source.app.app.get_id()]);
    				if (!fileUri)
    					return false;
    				const configDir = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'applications']);
    	
    				let src = Gio.file_new_for_path(fileUri);
    				let dst = Gio.File.new_for_path(GLib.build_filenamev([configDir, src.get_basename()]));
    				try {
    					src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
                        this.favoritesManager.addFavorite(this._source.app.app.get_id());
    				} catch(e) {
    					log('Failed to copy to applications folder: ' + e.message);
    				}                    
                }));
            }
			// Add to Global Favorites
			let canFavorite = global.settings.is_writable('favorite-apps');
            if (canFavorite) {
                let isFavorite = AppFavorites.getAppFavorites().isFavorite(this._source.app.app.get_id());
                if (isFavorite) {
                    let item = this._appendMenuItem(_("Remove from Global Favorites"));
                    item.connect('activate', Lang.bind(this, function() {
                        let favs = AppFavorites.getAppFavorites();
                        favs.removeFavorite(this._source.app.app.get_id());
                    }));
                } else {
                    let item = this._appendMenuItem(_("Add to Global Favorites"));
                    item.connect('activate', Lang.bind(this, function() {
                    	// Copies the desktop file to "/home/.local/share/applications"
                    	let fileUri = GLib.build_filenamev([cache_path, this._source.app.app.get_id()]);
        				if (!fileUri)
        					return false;
        				const configDir = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'applications']);
        	
        				let src = Gio.file_new_for_path(fileUri);
        				let dst = Gio.File.new_for_path(GLib.build_filenamev([configDir, src.get_basename()]));
        				try {
        					src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
        					let favs = AppFavorites.getAppFavorites();
                            favs.addFavorite(this._source.app.app.get_id());
        				} catch(e) {
        					log('Failed to copy to applications folder: ' + e.message);
        				}
                    }));
                }
            }
			
			this._appendSeparator();
			
		} else if (this._source._type == AppType.APPLICATION) {
			/* Open Commands */
			// Open folder with default Application
			this._activateAppItem = this._appendMenuItem("Open");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._activateApp();
			}));
			
			/* */
			let windows = this._source.app.get_windows().filter(function(w) {
	            return !w.skip_taskbar;
	        });

	        // Display the app windows menu items and the separator between windows
	        // of the current desktop and other windows.
	        let activeWorkspace = global.screen.get_active_workspace();
	        let separatorShown = windows.length > 0 && windows[0].get_workspace() != activeWorkspace;

	        for (let i = 0; i < windows.length; i++) {
	            let window = windows[i];
	            if (!separatorShown && window.get_workspace() != activeWorkspace) {
	                this._appendSeparator();
	                separatorShown = true;
	            }
	            let item = this._appendMenuItem(window.title);
	            item.connect('activate', Lang.bind(this, function() {
	                this.emit('activate-window', window);
	            }));
	        }

	        if (!this._source.app.is_window_backed()) {
	            this._appendSeparator();

	            let appInfo = this._source.app.get_app_info();
	            let actions = appInfo.list_actions();
	            if (this._source.app.can_open_new_window() &&
	                actions.indexOf('new-window') == -1) {
	                this._newWindowMenuItem = this._appendMenuItem(_("New Window"));
	                this._newWindowMenuItem.connect('activate', Lang.bind(this, function() {
	                    if (this._source.app.state == Shell.AppState.STOPPED)
	                        this._source.animateLaunch();

	                    this._source.app.open_new_window(-1);
	                    this.emit('activate-window', null);
	                }));
	                this._appendSeparator();
	            }

	            if (discreteGpuAvailable &&
	                this._source.app.state == Shell.AppState.STOPPED &&
	                actions.indexOf('activate-discrete-gpu') == -1) {
	                this._onDiscreteGpuMenuItem = this._appendMenuItem(_("Launch using Dedicated Graphics Card"));
	                this._onDiscreteGpuMenuItem.connect('activate', Lang.bind(this, function() {
	                    if (this._source.app.state == Shell.AppState.STOPPED)
	                        this._source.animateLaunch();

	                    this._source.app.launch(0, -1, true);
	                    this.emit('activate-window', null);
	                }));
	            }

	            for (let i = 0; i < actions.length; i++) {
	                let action = actions[i];
	                let item = this._appendMenuItem(appInfo.get_action_name(action));
	                item.connect('activate', Lang.bind(this, function(emitter, event) {
	                    this._source.app.launch_action(action, event.get_time(), -1);
	                    this.emit('activate-window', null);
	                }));
	            }
	        }
			
			

			/* Add to Favorites */
			// Add to Local Favorites
            this._appendSeparator();
            let isFavorite = this.favoritesManager.isFavorite(this._source.app.get_id());
            if (isFavorite) {
                let item = this._appendMenuItem(_("Remove from Favorites"));
                item.connect('activate', Lang.bind(this, function() {
                    this.favoritesManager.removeFavorite(this._source.app.get_id());
                }));
            } else {
                let item = this._appendMenuItem(_("Add to Favorites"));
                item.connect('activate', Lang.bind(this, function() {
                    this.favoritesManager.addFavorite(this._source.app.get_id());
                }));
            }
			// Add to Global Favorites
			let canFavorite = global.settings.is_writable('favorite-apps');
            if (canFavorite) {
                let isFavorite = AppFavorites.getAppFavorites().isFavorite(this._source.app.get_id());
                if (isFavorite) {
                    let item = this._appendMenuItem(_("Remove from Global Favorites"));
                    item.connect('activate', Lang.bind(this, function() {
                        let favs = AppFavorites.getAppFavorites();
                        favs.removeFavorite(this._source.app.get_id());
                    }));
                } else {
                    let item = this._appendMenuItem(_("Add to Global Favorites"));
                    item.connect('activate', Lang.bind(this, function() {
                        let favs = AppFavorites.getAppFavorites();
                        favs.addFavorite(this._source.app.get_id());
                    }));
                }
            }
			//TODO(REPLACE PARENT WITH OWN MENU OPTIONS and remove parent and inheritance)
		}
	}
});
