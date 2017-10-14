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

const constants = Menyy.imports.constants;
const AppType = constants.AppType;

/*
 *  Create a new popupmenu that could later be adapted to be a generic popupmenu that has a hierarchy!
 *  (menus within menus like a normal GUI would do it!!!)
 */
const openWithSubMenu = new Lang.Class({
	Name: 'Menyy.openWithSubMenu',
	//Extends: AppDisplay.AppIconMenu,
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
		this.command = "gnome-terminal --execute " + this._source.app.command;
		Util.spawnCommandLine(this.command);
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
		
		// Open Buttons
		
		// Add an open button to all apps!
		this._activateAppItem = this._appendMenuItem("Open");
		this._activateAppItem.connect('activate', Lang.bind(this, function() {
			this._activateApp();
		}));


		// Add open with menus
		if ((this._source._type == AppType.FILE) || (this._source._type == AppType.FOLDER)|| (this._source._type == AppType.WEBBOOKMARK)) {
			//Add an open button to all apps!
			this._openWithItem = this._appendMenuItem("Open With...");
			this._openWithItem.connect('activate', Lang.bind(this, function() {
				this._openWithSubMenu();
			}));
		} else if (this._source._type == AppType.TERMINAL) {
			this._openWithItem = this._appendMenuItem("Open In Terminal");
			this._openWithItem.connect('activate', Lang.bind(this, function() {
				this._openWithSubMenuTerminal();
			}));
		}
		
		
		// Copy Buttons
		this._appendSeparator();
		
		if (this._source._type != AppType.WEBBOOKMARK) {
			//Add a Copy Button to All Apps
			this._activateAppItem = this._appendMenuItem("Copy file");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyFile();
			}));
		}
		
		// It would be too much trouble to generate temporary files to copy via xclipboard
		if (this._source._type == AppType.FILE) {
			//Add a Copy Button to All Apps
			this._activateAppItem = this._appendMenuItem("Copy contents");
			this._activateAppItem.connect('activate', Lang.bind(this, function() {
				this._copyFileContents();
			}));
		}
		
		
		//Add a Copy Uri Button to All Apps
		this._activateAppItem = this._appendMenuItem("Copy location");
		this._activateAppItem.connect('activate', Lang.bind(this, function() {
			this._copyUri();
		}));
		
		
		
		
		// For the time being just override for applications
		if (this._source._type == AppType.APPLICATION) {
			this.parent();
		}
	}
});
