// Gnome-Shell and GTK files
const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const PanelMenu = imports.ui.panelMenu;
const GnomeSession = imports.misc.gnomeSession;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Atk = imports.gi.Atk;
const Gtk = imports.gi.Gtk;
const Signals = imports.signals;
const GMenu = imports.gi.GMenu;
const Shell = imports.gi.Shell;
const appSys = Shell.AppSystem.get_default();
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;








// My extension files
const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const systemButtons = Menyy.imports.systemButtons;
const menuButtons = Menyy.imports.menuButtons;
const placeDisplay = Menyy.imports.placeDisplay;
const convenience = Menyy.imports.convenience;
const MenuButtonWidget = Menyy.imports.menuWidget.MenuButtonWidget;
// const ApplicationsMenu = Menyy.imports.menu.ApplicationsMenu;

// SystemButtons
const PowerButton = systemButtons.PowerButton;
const ShellButton = systemButtons.ShellButton;
const LogoutButton = systemButtons.LogoutButton;
const SuspendButton = systemButtons.SuspendButton;
const LockButton = systemButtons.LockButton;

// MenuButtons
const CategoryListButton = menuButtons.CategoryListButton;
const AppListButton = menuButtons.AppListButton;
Signals.addSignalMethods(AppListButton.prototype);
const AppGridButton = menuButtons.AppGridButton;
Signals.addSignalMethods(AppGridButton.prototype);
const ShortcutButton = menuButtons.ShortcutButton;
const UserMenuItem = menuButtons.UserMenuItem;
const BackMenuItem = menuButtons.BackMenuItem;

// Old ones
const BaseMenuItem = menuButtons.BaseMenuItem;




// LOOK settings
var LocationHorizontal = 0; 
var LocationVertical = 0;
var SearchLocation = 0;
var CategoryLocation = 0;
var defaultCategory = 1;
var searchFixed = false;
// DELETEME!
const ApplicationType = {
	    APPLICATION: 0,
	    PLACE: 1,
	    RECENT: 2
	};
const visibleMenus = {
    ALL: 0,
    APPS_ONLY: 1,
    SYSTEM_ONLY: 2
};
const ApplicationsViewMode = {
	    LIST: 0,
	    GRID: 1
	};
const CategoriesViewMode= {
	    LEFT: 0,
	    RIGHT: 1,
	    COMBINED: 2,
	    ACCORDION: 3
	};

const SelectMethod = {
		HOVER: 0,
		SELECT: 1
}
const HomeView = {
		NONE: 0,
		CATEGORIES: 1,
		FREQUENT: 2,
		FAVORITES: 3,
		CUSTOM: 4,
		ALL: 5,
		RECENT: 6
}

const HomeViewSettings = HomeView.FREQUENT;



// Move to a math file
const calculatePercent = function (size, percent, unit) {
	var first = (size/100*percent).toString(); + unit;
	var second= (size/100*percent).toString(); + unit;
	return (first, second);
}








// Aplication menu class
const ApplicationsPopupMenu = new Lang.Class({
    Name: 'ApplicationsPopupMenu',
    Extends: PopupMenu.PopupMenu,

    // Initialize the menu
    _init: function(sourceActor, arrowAlignment, arrowSide, button, settings) {
        this._settings = settings;
        this.parent(sourceActor, arrowAlignment, arrowSide);
        this._button = button;
    },

    // Return that the menu is not empty (used by parent class)
    isEmpty: function() {
	    return false;
    },

    // Handle opening the menu
    open: function(animate) {
        this.parent(animate);
        if (this._settings.get_enum('visible-menus') != visibleMenus.SYSTEM_ONLY) {
             global.stage.set_key_focus(this._button.searchEntry);
        }
    },

    // Handle closing the menu
    close: function(animate) {
        let size = Main.layoutManager.panelBox.height;
        if (this._button.appsBox) {
            this._button._selectCategory(null);
            this._button.resetSearch();
        }
        this.parent(animate);
    }
});


const ApplicationsMenu = new Lang.Class({
    Name: 'ApplicationsMenu',
    Extends: PanelMenu.Button,
    
    // Init
    _init: function(settings) {
    	this._settings = settings;
    	this.parent(1.0, null, false);
    	this._session = new GnomeSession.SessionManager();
    	
    	// Frequent apps list
    	this._frequentApps = new Array();
    	// Favorite apps list
    	this._favorites = new Array();
        this._places = new Array();
        this._recent = new Array();
        this._menyy_favorites = new Array();// Custom favorites menu
        this._appGridColumns = this._settings.get_int('apps-grid-column-count');
        this._appsViewMode = this._settings.get_enum('apps-viewmode');
        this._categoriesViewMode = this._settings.get_enum('categories-viewmode');
        
        
        this._menuButtonWidget = new MenuButtonWidget();
        this.actor.add_actor(this._menuButtonWidget);

        this.setMenu(new ApplicationsPopupMenu(this.actor, 1.0, St.Side.TOP, this, this._settings));
        Main.panel.menuManager.addMenu(this.menu);
        this.actor.accessible_role = Atk.Role.LABEL;

        this.actor.name = 'panelApplications';
        this.actor.connect('captured-event', Lang.bind(this, this._onCapturedEvent));
        this.actor.connect('destroy', Lang.bind(this, this._onDestroy));
        this._showingId = Main.overview.connect('showing', Lang.bind(this, function() {
            this.actor.add_accessible_state (Atk.StateType.CHECKED);
        }));
        this._hidingId = Main.overview.connect('hiding', Lang.bind(this, function() {
            this.actor.remove_accessible_state (Atk.StateType.CHECKED);
        }));

        this.reloadFlag = false;
        this._firstCreateLayout();
        this._display();
        this._installedChangedId = appSys.connect('installed-changed', Lang.bind(this, function() {
            if (this.menu.isOpen) {
                this._redisplay();
                this.mainBox.show();
            } else {
                this.reloadFlag = true;
            }
        }));
        this._panelBoxChangedId = Main.layoutManager.connect('panel-box-changed', Lang.bind(this, function() {
            container.queue_relayout();
        }));
        Main.panel.actor.connect('notify::height', Lang.bind(this,
            function() {
                this._redisplay();
            }));
        
        
        
        // Load Categories into memory, so there'd be no slowdowns!
        this._loadFavorites();
    	this._loadFrequent();
        this._loadAllAppsList();
        
        // Loads a separate Home screen
        this._loadHome();
        
        // Deal with Places
        this.placesManager = null;
    },
    
    // Create the menu layout
    _firstCreateLayout: function() {
    	let section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(section);
        this.mainBox = new St.BoxLayout({ vertical: true,
                                          style_class: 'menyy-main-box menyy-spacing' });
        section.actor.add_actor(this.mainBox);
        this._createLayout();
    },
    
    _createLayout: function() {
        // whole menu height
        // this.mainBox.set_style('height: ' +
		// (this._settings.get_int('menu-height')).toString() + 'em');
        
        // Menu sections and Search+Controls
        this.topBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-top-box menyy-spacing' });
        this.bottomBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-bottom-box menyy-spacing' , y_align: St.Align.END });
        
        // Categories and Places
        this.leftBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-left-box menyy-spacing', x_align: St.Align.END});
        this.rightBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-right-box menyy-spacing', x_align: St.Align.END });
        
        // Search
        this.searchBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-search-box', y_align:St.Align.MIDDLE});
        this._searchInactiveIcon = new St.Icon({ style_class: 'search-entry-icon', icon_name: 'edit-find-symbolic', icon_size: 16 });
        this._searchActiveIcon = new St.Icon({ style_class: 'search-entry-icon', icon_name: 'edit-clear-symbolic', icon_size: 16 });
        this.searchEntry = new St.Entry({ name: 'search-entry',
                                     hint_text: _("Type to search…"),
                                     track_hover: true,
                                     can_focus: true });
        this.searchEntry.set_primary_icon(this._searchInactiveIcon);
        this.searchBox.add(this.searchEntry, { expand: true,
                                               x_align:St.Align.MIDDLE,
                                               y_align:St.Align.MIDDLE
                                             });
        this.searchActive = false;
        this.searchEntryText = this.searchEntry.clutter_text;
        this.searchEntryText.connect('text-changed', Lang.bind(this, this._onSearchTextChanged));
        this.searchEntryText.connect('key-press-event', Lang.bind(this, this._onMenuKeyPress));
        this._previousSearchPattern = "";
        this._searchIconClickedId = 0;
        
        
        // System Controls
        /*
		 * this.systemBoxContainer = new St.BoxLayout({ vertical: true,
		 * style_class: 'menyy-system-box-container', y_align: St.Align.END });
		 */
        this.systemBox = new PopupMenu.PopupBaseMenuItem({ reactive: false,
            can_focus: false, style_class: 'menyy-system-box menyy-spacing'});
        
        // Categories, main display and places
        if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
        	this.categoryBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-categories-box-inside menyy-spacing' });
        }
        // this.categoryBoxContainer = new St.BoxLayout({ vertical: false,
		// style_class: 'menyy-categories-box-container menyy-spacing'});
    	if (this._appsViewMode == ApplicationsViewMode.LIST) { // ListView
        	this.appsBox = new St.BoxLayout({vertical: true, style_class: 'menyy-applications-box menyy-spacing' });
        	this.appsBoxWrapper = this.appsBox;
        	
        	//Home Box
        	this.homeBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-home-box' });
        	this.homeBoxWrapper = this.homeBox;
        } else {
        	this.appsBox = new St.Widget({ layout_manager: new Clutter.TableLayout(), reactive:true, style_class: 'menyy-applications-box-grid'});
        	this.appsBoxWrapper = new St.BoxLayout({ style_class: 'menyy-applications-box-wrapper' });
            this.appsBoxWrapper.add(this.appsBox, {x_fill:false, y_fill: false, x_align: St.Align.START, y_align: St.Align.START});
            
            //Home Box
            this.homeBox =  new St.Widget({ layout_manager: new Clutter.TableLayout(), reactive:true, style_class: 'menyy-home-box-grid'});
            this.homeBoxWrapper = new St.BoxLayout({ style_class: 'menyy-applications-box-wrapper' });
            this.homeBoxWrapper.add(this.homeBox, {x_fill:false, y_fill: false, x_align: St.Align.START, y_align: St.Align.START});
        }
    	
    	
    	
    	// AppsBox Scroll
        this.appsScrollBox = new St.ScrollView({x_fill: true, y_fill: true, y_align: St.Align.START, style_class: 'vfade menyy-applications-box-scrollview' });
		this.appsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		let vScrollApps = this.appsScrollBox.get_vscroll_bar();
		vScrollApps.connect('scroll-start', Lang.bind(this, function() {
			this.menu.passEvents = true;
		}));
		vScrollApps.connect('scroll-stop', Lang.bind(this, function() {
			this.menu.passEvents = false;
		}));
		this.appsScrollBox.add_actor(this.appsBoxWrapper);
		
		
		
		// HomeBox Scroll
        this.homeScrollBox = new St.ScrollView({x_fill: true, y_fill: true, y_align: St.Align.START, style_class: 'vfade menyy-applications-box-scrollview' });
		this.homeScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		let vScrollHome = this.homeScrollBox.get_vscroll_bar();
		vScrollHome.connect('scroll-start', Lang.bind(this, function() {
			this.menu.passEvents = true;
		}));
		vScrollHome.connect('scroll-stop', Lang.bind(this, function() {
			this.menu.passEvents = false;
		}));
		this.homeScrollBox.add_actor(this.homeBoxWrapper);
		
		
		
		
		
        this.placesBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-places-box menyy-spacing'});
        
        
        
        
        // Add top and bottom
        this.mainBox.add(this.topBox);
        this.mainBox.add(this.bottomBox);

        
		// CategoryBoxScrollable
        if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
	        this.categoryScrollBox = new St.ScrollView({y_align: St.Align.START,
	            style_class: 'menyy-categories-box-scrollview menyy-spacing' });
			this.categoryScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
			let vscroll2 = this.categoryScrollBox.get_vscroll_bar();
			vscroll2.connect('scroll-start', Lang.bind(this, function() {
				this.menu.passEvents = true;
			}));
			vscroll2.connect('scroll-stop', Lang.bind(this, function() {
				this.menu.passEvents = false;
			}));
			this.categoryScrollBox.add_actor(this.categoryBox);
        }
		
		this.appsScrollBoxContainer = new St.BoxLayout({ vertical: true, style_class: 'menyy-top-box menyy-spacing' });
		this.appsScrollBoxContainer.add(this.appsScrollBox, {expand: true});
		
		// Add and hide homebox
		this.appsScrollBoxContainer.add(this.homeScrollBox, {expand: true});
		this.homeScrollBox.hide();
		
        
        // Add to top or bottom
		// ADDSETTINGS
        if (LocationHorizontal == 0) {
        	this.bottomBox.add(this.searchBox, {expand: true, x_fill: true, y_fill: false,
                y_align: St.Align.MIDDLE });
        	this.bottomBox.add(this.systemBox.actor, { expand: false,
                x_fill: true, y_fill: false,
                y_align: St.Align.END });
            this.topBox.add(this.leftBox);
            this.topBox.add(this.rightBox);
        } else {
        	this.topBox.add(this.searchBox, {expand: true, x_fill: true, y_fill: true,
                y_align: St.Align.START });
        	this.topBox.add(this.systemBox.actor, { expand: false,
                x_fill: true, y_fill: false,
                y_align: St.Align.MIDDLE });
            this.bottomBox.add(this.leftBox);
            this.bottomBox.add(this.rightBox);
        }
        
        // ADDSETTINGS
        if (LocationVertical == 0) {
        	if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
        		this.leftBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
        	}
        	this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
        	this.rightBox.add(this.placesBox);
        } else {
        	if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
        		this.rightBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
        	}
        	this.rightBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
        	this.leftBox.add(this.placesBox);
        }
        
    	if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
	    	this.backButton = new BackMenuItem(this, 'backToCategories');
	    	this.backToButton = new BackMenuItem(this, 'backToHome');
	    	this.goToButton = new BackMenuItem(this, 'goToCategories');
	        this.appsScrollBoxContainer.add(this.backButton.actor, { expand: false,
	                                             x_fill: true, y_fill: false,
	                                             y_align: St.Align.START });
	        this.appsScrollBoxContainer.add(this.backToButton.actor, { expand: false,
                x_fill: true, y_fill: false,
                y_align: St.Align.START });
	        this.appsScrollBoxContainer.add(this.goToButton.actor, { expand: false,
                x_fill: true, y_fill: false,
                y_align: St.Align.START });
    	}
        
        
        
        
        
		 // Add session buttons to menu
		let shellrestart = new ShellButton(this);
        this.systemBox.actor.add(shellrestart.actor, { expand: false,
                                                  x_fill: false,
                                                  y_align: St.Align.START
                                                });
		
		
        let logout = new LogoutButton(this);
        this.systemBox.actor.add(logout.actor, { expand: false,
                                                  x_fill: false,
                                                  y_align: St.Align.START
                                                });
        
        
        let lock = new LockButton(this);
        this.systemBox.actor.add(lock.actor, { expand: false,
                                                x_fill: false,
                                                y_align: St.Align.START
                                              });

        let suspend = new SuspendButton(this);
        this.systemBox.actor.add(suspend.actor, { expand: false,
                                                x_fill: false,
                                                y_align: St.Align.START
                                              });

        let power = new PowerButton(this);
        this.systemBox.actor.add(power.actor, { expand: false,
                                                 x_fill: false,
                                                 y_align: St.Align.START
                                               });
        
        
        let user = new UserMenuItem(this);
        this.placesBox.add(user.actor, { expand: false,
                                        x_fill: true,
                                        y_fill: false,
                                        y_align: St.Align.START
                                      });

        let separator = new PopupMenu.PopupSeparatorMenuItem();
        this.placesBox.add(separator.actor, { expand: false,
                                             x_fill: true, y_fill: false,
                                             y_align: St.Align.START
                                           });
        
        // Add Places
        this._loadPlaces();
        
        
        this._setLayoutSizes();
    },
    
    
    // Separate, because maybe needs to destroy something or keep settings
    _reCreateLayout: function() {
        let actors = this.mainBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.mainBox.remove_actor(actor);
        }
        
        
    	this._appsViewMode = this._settings.get_enum('apps-viewmode');
    	this._categoriesViewMode = this._settings.get_enum('categories-viewmode');
    	this._appGridColumns = this._settings.get_int('apps-grid-column-count');
    	// if grid mode, then set menu width to 0
    	this._createLayout();
    	this._loadHome();
    	// this._redisplay();
    },
    
    _setLayoutSizes: function() {
		// Set layout sizes
    	this.appsScrollBoxContainer.set_style(
    				'height: ' + (this._settings.get_int('menubox-height')).toString() + 'px'
    			);
    	this.appsBoxWrapper.set_style(
    				'width: ' + (this._settings.get_int('appsbox-width')).toString() + 'px'
    			);
    	this.homeBoxWrapper.set_style(
				'width: ' + (this._settings.get_int('appsbox-width')).toString() + 'px'
			);
    	
    	
    	// Categories
    	if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
			if (this._settings.get_int('categoriesbox-width') > 0) {
				this.categoryScrollBox.set_style(
						'width: ' + (this._settings.get_int('categoriesbox-width')).toString() + 'px; ' +
						'height: ' + (this._settings.get_int('menubox-height')).toString() + 'px; ' +
						'max-height: ' + (this._settings.get_int('menubox-height')).toString() + 'px; '
					);
			} else {
				this.categoryScrollBox.set_style(
						'height: ' + (this._settings.get_int('menubox-height')).toString() + 'px; ' +
						'max-height: ' + (this._settings.get_int('menubox-height')).toString() + 'px; '
					);
			}
    	}
		
		
		// Places
		if (this._settings.get_int('placesbox-width') > 0) {
			this.placesBox.set_style(
					'height: ' + (this._settings.get_int('menubox-height')).toString() + 'px; ' +
					'width: ' + (this._settings.get_int('placesbox-width')).toString() + 'px'
				);
		} else {
			this.placesBox.set_style(
					'height: ' + (this._settings.get_int('menubox-height')).toString() + 'px'
					);
		}
			
    },
    
    _toggleMenu: function() {
    	this.menu.toggle();
    },

    _getWidget: function() {
        return this._menuButtonWidget;
    },
    
    
    // Load Default Apps Panel Items
    _loadHome: function() {
        if (this.homeBox)
            this.homeBox.destroy_all_children();
        global.log("menyy: hv " + (typeof HomeViewSettings));
        this._displayButtons(_, this._listApplications(HomeViewSettings));
        //this._displayButtons(appResults);
        
    },
    
    
    
    
    // Load Frequent Apps
    _loadFrequent: function() {
    	this._frequentApps = new Array();
        let mostUsed = Shell.AppUsage.get_default().get_most_used('');
        for (let i=0; i<mostUsed.length; i++) {
            if (mostUsed[i].get_app_info().should_show())
                this._frequentApps.push(mostUsed[i]);
        }
    },
    
    // Load Favorite Apps
    _loadFavorites: function() {
    	this._favorites = new Array();
    	let launchers = global.settings.get_strv('favorite-apps');
        for (let i = 0; i < launchers.length; ++i) {
            let app = Shell.AppSystem.get_default().lookup_app(launchers[i]);
            if (app)
                this._favorites.push(app);
        }
    },
    
    // Load All Apps
    _loadAllAppsList: function () {
    	this._allAppsList = new Array();
    	for (let directory in this.applicationsByCategory)
            this._allAppsList = this._allAppsList.concat(this.applicationsByCategory[directory]);
    },
    
    // Load menu category data for a single category
    _loadCategory: function(categoryId, dir) {
        let iter = dir.iter();
        let nextType;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.ENTRY) {
                let entry = iter.get_entry();
                let id;
                try {
                    id = entry.get_desktop_file_id();
                } catch(e) {
                    continue;
                }
                let app = appSys.lookup_app(id);
                if (app.get_app_info().should_show())
                    this.applicationsByCategory[categoryId].push(app);
            } else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let subdir = iter.get_directory();
                if (!subdir.get_is_nodisplay())
                    this._loadCategory(categoryId, subdir);
            }
        }
    },
    
    // Load EXTRA categories
    _loadTab: function(tabId, dir) {
    	
    },
    _loadTabs: function() {
    	
    },
    
    // Load data for all menu categories
    _loadCategories: function() {
    	// this._loadFavorites();
    	// this._loadFrequent();
        this.applicationsByCategory = {};
        let tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        tree.load_sync();
        let root = tree.get_root_directory();
        let iter = root.iter();
        let nextType;
        let selectionMethod;
        let _hoverTimeOutId;
        this.hoverDelay =  this._settings.get_int('categories-hover-delay');
        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
        	this.selectionMethod = SelectMethod.CLICK;
        } else {
        	this.selectionMethod = this._settings.get_enum('categories-selection-method');
        }
        
        
        
        /*
		 * Favorite Apps Category
		 */
        
        let favAppCategory = new CategoryListButton('favorites', _('Favorite Apps'), 'applications-other');
        favAppCategory.setButtonEnterCallback(Lang.bind(this, function() {
            favAppCategory.actor.add_style_class_name('selected');
            // this.selectedAppTitle.set_text(freqAppCategory.label.get_text());
            // this.selectedAppDescription.set_text('');

            if (favAppCategory._ignoreHoverSelect)
                return;

        	if (this.selectionMethod == SelectMethod.HOVER ) {
                this._hoverTimeoutId = Mainloop.timeout_add((this.hoverDelay >0) ? this.hoverDelay : 0, Lang.bind(this, function() {
                    this._selectCategory(freqAppCategory);
                    this._hoverTimeoutId = 0;
                 }));
            }
        }));
        favAppCategory.setButtonLeaveCallback(Lang.bind(this, function() {
            favAppCategory.actor.remove_style_class_name('selected');
            // this.selectedAppTitle.set_text('');
            // this.selectedAppDescription.set_text('');
            
            
            if (this.selectionMethod == SelectMethod.HOVER ) {
                if (this._hoverTimeoutId > 0) {
                    Mainloop.source_remove(this._hoverTimeoutId);
                }
            }
        }));
        favAppCategory.setButtonPressCallback(Lang.bind(this, function() {
            freqAppCategory.actor.add_style_pseudo_class('pressed');
        }));
        favAppCategory.setButtonReleaseCallback(Lang.bind(this, function() {
            favAppCategory.actor.remove_style_pseudo_class('pressed');
            favAppCategory.actor.remove_style_class_name('selected');
            // this._startupAppsView = StartupAppsDisplay.FREQUENT;
            this._selectCategory(favAppCategory);
            // this.selectedAppTitle.set_text(freqAppCategory.label.get_text());
            // this.selectedAppDescription.set_text('');
        }));
        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
        	this.appsBox.add_actor(favAppCategory.actor);
        } else {
        	this.categoryBox.add_actor(favAppCategory.actor);
        }
        
        
        /*
		 * All Apps Category
		 */
        /*
		 * Try and make it load different icons if exist and fallback to
		 * applications-other
		 */
        // dir, alttext, alticon
        let allAppsCategory = new CategoryListButton('all', _('All Applications'), 'applications-other');
        allAppsCategory.setButtonEnterCallback(Lang.bind(this, function() {
            allAppsCategory.actor.add_style_class_name('selected');
            // this.selectedAppTitle.set_text(allAppsCategory.label.get_text());
            // this.selectedAppDescription.set_text('');

            if (allAppsCategory._ignoreHoverSelect)
                return;

            if (selectionMethod == SelectMethod.HOVER ) {
                this._hoverTimeoutId = Mainloop.timeout_add((hoverDelay >0) ? hoverDelay : 0, Lang.bind(this, function() {
                    // this._selectCategory(allAppsCategory);
                	this._selectCategory(allAppsCategory);
                    this._hoverTimeoutId = 0;
                }));
            }
        }));
        allAppsCategory.setButtonLeaveCallback(Lang.bind(this, function() {
            allAppsCategory.actor.remove_style_class_name('selected');
            // this.selectedAppTitle.set_text('');
            // this.selectedAppDescription.set_text('');

            if (selectionMethod == SelectMethod.HOVER ) {
                if (this._hoverTimeoutId > 0) {
                    Mainloop.source_remove(this._hoverTimeoutId);
                }
            }
        }));
        allAppsCategory.setButtonPressCallback(Lang.bind(this, function() {
            allAppsCategory.actor.add_style_pseudo_class('pressed');
        }));
        allAppsCategory.setButtonReleaseCallback(Lang.bind(this, function() {
            allAppsCategory.actor.remove_style_pseudo_class('pressed');
            allAppsCategory.actor.remove_style_class_name('selected');
            // this._startupAppsView = StartupAppsDisplay.ALL;
            this._selectCategory(allAppsCategory);
            // this.selectedAppTitle.set_text(allAppsCategory.label.get_text());
            // this.selectedAppDescription.set_text('');
        }));
        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
        	this.appsBox.add_actor(allAppsCategory.actor);
        } else {
        	this.categoryBox.add_actor(allAppsCategory.actor);
        }
        
        
        // Frequent Category
        let freqAppCategory = new CategoryListButton('frequent', _('Frequent Apps'), 'applications-other');
        freqAppCategory.setButtonEnterCallback(Lang.bind(this, function() {
            freqAppCategory.actor.add_style_class_name('selected');
            // this.selectedAppTitle.set_text(freqAppCategory.label.get_text());
            // this.selectedAppDescription.set_text('');

            if (freqAppCategory._ignoreHoverSelect)
                return;

            if (this.selectionMethod == SelectMethod.HOVER ) {
                this._hoverTimeoutId = Mainloop.timeout_add((hoverDelay >0) ? hoverDelay : 0, Lang.bind(this, function() {
                    this._selectCategory(freqAppCategory);
                    this._hoverTimeoutId = 0;
                 }));
            }
        }));
        freqAppCategory.setButtonLeaveCallback(Lang.bind(this, function() {
            freqAppCategory.actor.remove_style_class_name('selected');
            // this.selectedAppTitle.set_text('');
            // this.selectedAppDescription.set_text('');
            
            
            // if (settings.get_enum('category-selection-method') ==
			// SelectMethod.HOVER ) {
            if (false) {
                if (this._hoverTimeoutId > 0) {
                    Mainloop.source_remove(this._hoverTimeoutId);
                }
            }
        }));
        freqAppCategory.setButtonPressCallback(Lang.bind(this, function() {
            freqAppCategory.actor.add_style_pseudo_class('pressed');
        }));
        freqAppCategory.setButtonReleaseCallback(Lang.bind(this, function() {
            freqAppCategory.actor.remove_style_pseudo_class('pressed');
            freqAppCategory.actor.remove_style_class_name('selected');
            // this._startupAppsView = StartupAppsDisplay.FREQUENT;
            this._selectCategory(freqAppCategory);
            // this.selectedAppTitle.set_text(freqAppCategory.label.get_text());
            // this.selectedAppDescription.set_text('');
        }));
        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
        	this.appsBox.add_actor(freqAppCategory.actor);
        } else {
        	this.categoryBox.add_actor(freqAppCategory.actor);
        }
        
        
        
        /*
		 * Real Categories
		 */
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
        	if (nextType == GMenu.TreeItemType.DIRECTORY) {
        		let dir = iter.get_directory();
        		let categoryId = dir.get_menu_id();
                this.applicationsByCategory[categoryId] = [];
                // this._loadCategories(dir);
                this._loadCategory(categoryId, dir);
                if (this.applicationsByCategory[dir.get_menu_id()].length>0){
                    let appCategory = new CategoryListButton(dir);
                    appCategory.setButtonEnterCallback(Lang.bind(this, function() {
                        appCategory.actor.add_style_class_name('selected');
                        // this.selectedAppTitle.set_text(appCategory.label.get_text());
                        // this.selectedAppDescription.set_text('');

                        if (appCategory._ignoreHoverSelect)
                            return;

                        if (false){
                        // if (settings.get_enum('category-selection-method') ==
						// SelectMethod.HOVER ) {
                            // let hoverDelay =
							// settings.get_int('category-hover-delay');
                            this._hoverTimeoutId = Mainloop.timeout_add((hoverDelay >0) ? hoverDelay : 0, Lang.bind(this, function() {
                                this._selectCategory(appCategory);
                                this._hoverTimeoutId = 0;
                            }));
                        }
                    }));
                    appCategory.setButtonLeaveCallback(Lang.bind(this, function() {
                        appCategory.actor.remove_style_class_name('selected');
                        // this.selectedAppTitle.set_text('');
                        // this.selectedAppDescription.set_text('');

                        if (false){
                        // if (settings.get_enum('category-selection-method') ==
						// SelectMethod.HOVER ) {
                            if (this._hoverTimeoutId > 0) {
                                Mainloop.source_remove(this._hoverTimeoutId);
                            }
                        }
                    }));
                    appCategory.setButtonPressCallback(Lang.bind(this, function() {
                        appCategory.actor.add_style_pseudo_class('pressed');
                    }));
                    appCategory.setButtonReleaseCallback(Lang.bind(this, function() {
                        appCategory.actor.remove_style_pseudo_class('pressed');
                        appCategory.actor.remove_style_class_name('selected');
                        this._selectCategory(appCategory);
                        // this.selectedAppTitle.set_text(appCategory.label.get_text());
                        // this.selectedAppDescription.set_text('');
                    }));
                    if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
                    	this.appsBox.add_actor(appCategory.actor);
                    } else {
                    	this.categoryBox.add_actor(appCategory.actor);
                    }
                }
            }
        }
        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
        	this.backButton.actor.hide();
        	this.backToButton.actor.show();
        	this.goToButton.actor.hide();
        }
    },

    
    // Load menu place shortcuts
    _loadPlaces: function() {
    	if (placeDisplay) {
            // if (settings.get_enum('shortcuts-display') ==
			// ShortcutsDisplay.PLACES) {
    		if (true) {
                this.placesManager = new placeDisplay.PlacesManager(true);
            } else {
                this.placesManager = new placeDisplay.PlacesManager(false);
            }
        } else {
            this.placesManager = null;
        };
        
        // Load Places Panel
        let shortcuts = new Array();
        let shortcutType;
        // if (settings.get_enum('shortcuts-display') ==
		// ShortcutsDisplay.PLACES) {
        if (true){
            let places = this._listPlaces();
            let bookmarks = this._listBookmarks();
            let devices = this._listDevices();
            let allPlaces = places.concat(bookmarks.concat(devices));
            shortcuts = allPlaces;
            shortcutType = ApplicationType.PLACE;
        } else {
            shortcuts = this.favorites;
            shortcutType = ApplicationType.APPLICATION;
        }
        for (let i = 0; i < shortcuts.length; ++i) {
            let app = shortcuts[i];
            let shortcutButton = new ShortcutButton(app, shortcutType);
            this.placesBox.add_actor(shortcutButton.actor);
            shortcutButton.actor.connect('enter-event', Lang.bind(this, function() {
                shortcutButton.actor.add_style_class_name('selected');
                // if (settings.get_enum('shortcuts-display') ==
				// ShortcutsDisplay.PLACES) {
                    // this.selectedAppTitle.set_text(shortcutButton._app.name);
                    // this.selectedAppDescription.set_text("");
                // } else {
                    // this.selectedAppTitle.set_text(shortcutButton._app.get_name());
                    // if (shortcutButton._app.get_description())
					// this.selectedAppDescription.set_text(shortcutButton._app.get_description());
                    // else this.selectedAppDescription.set_text("");
                // }
            }));
            shortcutButton.actor.connect('leave-event', Lang.bind(this, function() {
                shortcutButton.actor.remove_style_class_name('selected');
                // this.selectedAppTitle.set_text("");
                // this.selectedAppDescription.set_text("");
            }));
            shortcutButton.actor.connect('button-press-event', Lang.bind(this, function() {
                shortcutButton.actor.add_style_pseudo_class('pressed');
            }));
            shortcutButton.actor.connect('button-release-event', Lang.bind(this, function() {
                shortcutButton.actor.remove_style_pseudo_class('pressed');
                shortcutButton.actor.remove_style_class_name('selected');
                // this.selectedAppTitle.set_text("");
                // this.selectedAppDescription.set_text("");
                // if (settings.get_enum('shortcuts-display') ==
				// ShortcutsDisplay.PLACES) {
                if (true){
                    if (app.uri) {
                        shortcutButton._app.app.launch_uris([app.uri], null);
                    } else {
                        shortcutButton._app.launch();
                    }
                } else {
                    shortcutButton._app.open_new_window(-1);
                }
                this.menu.close();
            }));
        }
    },
    
    
    _listPlaces: function(pattern) {
        if (!this.placesManager)
            return null;
        let places = this.placesManager.getDefaultPlaces();
        let res = [];
        for (let id = 0; id < places.length; id++) {
            if (!pattern || places[id].name.toLowerCase().indexOf(pattern)!=-1)
                res.push(places[id]);
        }
        return res;
    },

    _listBookmarks: function(pattern){
        if (!this.placesManager)
            return null;
        let bookmarks = this.placesManager.getBookmarks();
        let res = [];
        for (let id = 0; id < bookmarks.length; id++) {
            if (!pattern || bookmarks[id].name.toLowerCase().indexOf(pattern)!=-1)
                res.push(bookmarks[id]);
        }
        return res;
    },
    
    /*
	 * _listWebBookmarks: function(pattern) { if (!this._searchWebErrorsShown) {
	 * if (!Firefox.Gda) { let notifyTitle = _("Gno-Menu: Search Firefox
	 * bookmarks disabled"); let notifyMessage = _("If you want to search
	 * Firefox bookmarks, you must install the required pacakages:
	 * libgir1.2-gda-5.0 [Ubuntu] or libgda-sqlite [Fedora]");
	 * this.selectedAppTitle.set_text(notifyTitle);
	 * this.selectedAppDescription.set_text(notifyMessage); } if (!Midori.Gda) {
	 * let notifyTitle = _("Gno-Menu: Search Midori bookmarks disabled"); let
	 * notifyMessage = _("If you want to search Midori bookmarks, you must
	 * install the required pacakages: libgir1.2-gda-5.0 [Ubuntu] or
	 * libgda-sqlite [Fedora]"); this.selectedAppTitle.set_text(notifyTitle);
	 * this.selectedAppDescription.set_text(notifyMessage); } }
	 * this._searchWebErrorsShown = true;
	 * 
	 * let res = []; let searchResults = []; let bookmarks = [];
	 * 
	 * bookmarks = bookmarks.concat(Chromium.bookmarks); //bookmarks =
	 * bookmarks.concat(Epiphany.bookmarks); bookmarks =
	 * bookmarks.concat(Firefox.bookmarks); bookmarks =
	 * bookmarks.concat(GoogleChrome.bookmarks); bookmarks =
	 * bookmarks.concat(Midori.bookmarks); bookmarks =
	 * bookmarks.concat(Opera.bookmarks);
	 * 
	 * for (let id = 0; id < bookmarks.length; id++) { if (!pattern ||
	 * bookmarks[id].name.toLowerCase().indexOf(pattern)!=-1) { res.push({ app:
	 * bookmarks[id].appInfo, name: bookmarks[id].name, icon:
	 * bookmarks[id].appInfo.get_icon(), mime: null, uri: bookmarks[id].uri }); } }
	 * 
	 * res.sort(this._searchWebBookmarks.bookmarksSort); return res; },
	 */

    _listDevices: function(pattern) {
        if (!this.placesManager)
            return null;
        let devices = this.placesManager.getMounts();
        let res = new Array();
        for (let id = 0; id < devices.length; id++) {
            if (!pattern || devices[id].name.toLowerCase().indexOf(pattern)!=-1)
                res.push(devices[id]);
        }
        return res;
    },
    
    
    _listRecent: function(pattern) {
        let recentFiles = this.recentManager.get_items();
        let res = new Array();

        for (let id = 0; id < recentFiles.length; id++) {
            let recentInfo = recentFiles[id];
            if (recentInfo.exists()) {
                if (!pattern || recentInfo.get_display_name().toLowerCase().indexOf(pattern)!=-1) {
                    res.push({
                        name:   recentInfo.get_display_name(),
                        icon:   recentInfo.get_gicon(),
                        mime:   recentInfo.get_mime_type(),
                        uri:    recentInfo.get_uri()
                    });
                }
            }
        }
        return res;
    },
    
    
    
    
    
    /*
	 * // Load menu place shortcuts _loadPlaces: function() { let homePath =
	 * GLib.get_home_dir(); let placeInfo = new
	 * PlaceInfo(Gio.File.new_for_path(homePath), _("Home")); let placeMenuItem =
	 * new PlaceMenuItem(this, placeInfo);
	 * this.placesBox.add_actor(placeMenuItem.actor); let dirs =
	 * DEFAULT_DIRECTORIES.slice(); for (let i = 0; i < dirs.length; i++) { let
	 * path = GLib.get_user_special_dir(dirs[i]); if (path == null || path ==
	 * homePath) continue; let placeInfo = new
	 * PlaceInfo(Gio.File.new_for_path(path)); let placeMenuItem = new
	 * PlaceMenuItem(this, placeInfo);
	 * this.placesBox.add_actor(placeMenuItem.actor); }
	 *  },
	 */

    // Display application menu items
    _displayButtons: function(apps, home) {
    	// get from settings!
    	// let viewMode = this._appsViewMode;
    	let appType;
        // variables for icon grid layout
        let page = 0;
        let column = 0;
        let rownum = 0;
        
        if (home){
            appType = ApplicationType.APPLICATION;
            for (let i in home) {
            	let app = home[i];
            	if (this._appsViewMode == ApplicationsViewMode.LIST) { // ListView
            		let appListButton = new AppListButton(app, appType);
                    appListButton.actor.connect('enter-event', Lang.bind(this, function() {
                      appListButton.actor.add_style_class_name('selected');
                       // this.selectedAppTitle.set_text(appListButton._app.get_name());
                       // if (appListButton._app.get_description())
						// this.selectedAppDescription.set_text(appListButton._app.get_description());
                       // else this.selectedAppDescription.set_text("");
                    }));
                    appListButton.actor.connect('leave-event', Lang.bind(this, function() {
                      appListButton.actor.remove_style_class_name('selected');
                       // this.selectedAppTitle.set_text("");
                       // this.selectedAppDescription.set_text("");
                    }));
                    appListButton.actor.connect('button-press-event', Lang.bind(this, function() {
                        appListButton.actor.add_style_pseudo_class('pressed');
                    }));
                    appListButton.actor.connect('button-release-event', Lang.bind(this, function() {
                       appListButton.actor.remove_style_pseudo_class('pressed');
                       appListButton.actor.remove_style_class_name('selected');
                       // this.selectedAppTitle.set_text("");
                       // this.selectedAppDescription.set_text("");
                       appListButton._app.open_new_window(-1);
                       // võib-olla this._button.menu.toggle();
                       this.menu.close();
                    }));
                    this.homeBox.add_actor(appListButton.actor);
            	}
            }
        }

        if (apps){
            appType = ApplicationType.APPLICATION;
            for (let i in apps) {
            	let app = apps[i];
            	if (this._appsViewMode == ApplicationsViewMode.LIST) { // ListView
            		let appListButton = new AppListButton(app, appType);
                    appListButton.actor.connect('enter-event', Lang.bind(this, function() {
                      appListButton.actor.add_style_class_name('selected');
                       // this.selectedAppTitle.set_text(appListButton._app.get_name());
                       // if (appListButton._app.get_description())
						// this.selectedAppDescription.set_text(appListButton._app.get_description());
                       // else this.selectedAppDescription.set_text("");
                    }));
                    appListButton.actor.connect('leave-event', Lang.bind(this, function() {
                      appListButton.actor.remove_style_class_name('selected');
                       // this.selectedAppTitle.set_text("");
                       // this.selectedAppDescription.set_text("");
                    }));
                    appListButton.actor.connect('button-press-event', Lang.bind(this, function() {
                        appListButton.actor.add_style_pseudo_class('pressed');
                    }));
                    appListButton.actor.connect('button-release-event', Lang.bind(this, function() {
                       appListButton.actor.remove_style_pseudo_class('pressed');
                       appListButton.actor.remove_style_class_name('selected');
                       // this.selectedAppTitle.set_text("");
                       // this.selectedAppDescription.set_text("");
                       appListButton._app.open_new_window(-1);
                       // võib-olla this._button.menu.toggle();
                       this.menu.close();
                    }));
                    this.appsBox.add_actor(appListButton.actor);
                } else { // GridView
                    // let includeTextLabel =
					// (settings.get_int('apps-grid-label-width') > 0) ? true :
					// false;
                	let includeTextLabel = true;
                    let appGridButton = new AppGridButton(app, appType, includeTextLabel);
                    // DELETEME!
                    this._appGridButtonWidth = 64;
                    appGridButton.buttonbox.width = this._appGridButtonWidth;
                    appGridButton.actor.connect('enter-event', Lang.bind(this, function() {
                      appGridButton.actor.add_style_class_name('selected');
                       // this.selectedAppTitle.set_text(appGridButton._app.get_name());
                       // if (appGridButton._app.get_description())
						// this.selectedAppDescription.set_text(appGridButton._app.get_description());
                       // else this.selectedAppDescription.set_text("");
                    }));
                    appGridButton.actor.connect('leave-event', Lang.bind(this, function() {
                      appGridButton.actor.remove_style_class_name('selected');
                       // this.selectedAppTitle.set_text("");
                       // this.selectedAppDescription.set_text("");
                    }));
                    appGridButton.actor.connect('button-press-event', Lang.bind(this, function() {
                        appGridButton.actor.add_style_pseudo_class('pressed');
                    }));
                    appGridButton.actor.connect('button-release-event', Lang.bind(this, function() {
                       appGridButton.actor.remove_style_pseudo_class('pressed');
                       appGridButton.actor.remove_style_class_name('selected');
                       // this.selectedAppTitle.set_text("");
                       // this.selectedAppDescription.set_text("");
                       appGridButton._app.open_new_window(-1);
                       // this.menu.close();
                    }));
                    let gridLayout = this.appsBox.layout_manager;
                    gridLayout.pack(appGridButton.actor, column, rownum);
                    column ++;
                    if (column > this._appGridColumns-1) {
                        column = 0;
                        rownum ++;
                    }
                }
            	
            }
        }
        /*
		 * if (apps) { for (let i = 0; i < apps.length; i++) { let app =
		 * apps[i]; if (!this._applicationsButtons[app]) { let
		 * applicationMenuItem = new ApplicationMenuItem(this, app);
		 * this._applicationsButtons[app] = applicationMenuItem; } if
		 * (!this._applicationsButtons[app].actor.get_parent())
		 * this.appsBox.add_actor(this._applicationsButtons[app].actor); } }
		 */
    },
    
 // Scroll to a specific button (menu item) in the applications scroll view
    scrollToButton: function(button) {
        let appsScrollBoxAdj = this.appsScrollBox.get_vscroll_bar().get_adjustment();
        let appsScrollBoxAlloc = this.appsScrollBox.get_allocation_box();
        let currentScrollValue = appsScrollBoxAdj.get_value();
        let boxHeight = appsScrollBoxAlloc.y2 - appsScrollBoxAlloc.y1;
        let buttonAlloc = button.actor.get_allocation_box();
        let newScrollValue = currentScrollValue;
        if (currentScrollValue > buttonAlloc.y1 - 10)
            newScrollValue = buttonAlloc.y1 - 10;
        if (boxHeight + currentScrollValue < buttonAlloc.y2 + 10)
            newScrollValue = buttonAlloc.y2 - boxHeight + 10;
        if (newScrollValue != currentScrollValue)
            appsScrollBoxAdj.set_value(newScrollValue);
    },
    
    // Clear the applications menu box
    _clearAppsBox: function() {
        let actors = this.appsBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.appsBox.remove_actor(actor);
        }
    },
    
    // Clear the category menu box
    _clearCategoryBox: function() {
    	if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
	        let actors = this.categoryBox.get_children();
	        for (let i = 0; i < actors.length; i++) {
	            let actor = actors[i];
	            this.categoryBox.remove_actor(actor);
	        }
    	}
    },
    
    _selectCategory: function(button) {
    	this._clearAppsBox();
    	if (button){
	        let category = button._dir || button;
	        if (category == 'default') {
	        	this.homeScrollBox.show();
	        	this.appsScrollBox.hide();
	        	this.goToButton.actor.show();
	        	this.backButton.actor.hide();
	        	this.backToButton.actor.hide();
	        } else if (category == "categories"){
	        	this.homeScrollBox.hide();
	        	this.appsScrollBox.show();
	        	this._loadCategories();
    			this.backToButton.actor.show();
    			this.backButton.actor.hide();
    			this.goToButton.actor.hide();
    		} else if (typeof category == 'string') {
	        	this.homeScrollBox.hide();
	        	this.appsScrollBox.show();
	           // this._displayApplications(this._listApplications(category));
	            this._displayButtons(this._listApplications(category));
		        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
		        	this.backButton.actor.show();
		        	this.backToButton.actor.hide();
		        	this.goToButton.actor.hide();
		        }
	        } else {
	        	this.homeScrollBox.hide();
	        	this.appsScrollBox.show();
	            this._displayButtons(this._listApplications(category.get_menu_id()));
		        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
		        	this.backButton.actor.show();
		        	this.backToButton.actor.hide();
		        	this.goToButton.actor.hide();
		        }
	        }
    	} else {
    		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
	        	this.backButton.actor.hide();
	        	this.backToButton.actor.hide();
	        	this.goToButton.actor.hide();
	        }
    	}
    },
    
    // Get a list of applications for the specified category or search query
    _listApplications: function(category_menu_id, pattern) {
        let applist;
        
        if (typeof category_menu_id == 'number'){
        	/*
        	 * 	const HomeView = {
			 *	NONE: 0,
			 *	CATEGORIES: 1,
			 *	FREQUENT: 2,
			 *	FAVORITES: 3,
			 *	CUSTOM: 4,
			 *	ALL: 5,
			 *	RECENT: 6
			 *	}
        	 */
        	
            if (category_menu_id == 0) {
            	// Skip for now
            } else if (category_menu_id == 1) {
            	this._loadCategories();
        	} else if (category_menu_id == 2) {
                applist = this._frequentApps;
                // global.log("menyy: getting applist freq")
            } else if (category_menu_id == 3) {
                applist = this._favorites;
                // global.log("menyy: getting applist fav")
            } else if (category_menu_id == 4) {
            	// Skip for now
            } else if (category_menu_id == 6) {
            	// Skip for now
            } else {
            	applist = this._allAppsList;
            }
        } else {
            // Get proper applications list
            if (category_menu_id == 'all') {
            	// global.log("menyy: getting applist all")
            	applist = this._allAppsList;
        	} else if (category_menu_id == 'frequent') {
                applist = this._frequentApps;
                // global.log("menyy: getting applist freq")
            } else if (category_menu_id == 'favorites') {
                applist = this._favorites;
                // global.log("menyy: getting applist fav")
            } else if (category_menu_id == 'menyy') {
            	// do something once done
            } else  if (category_menu_id) {
            	applist = this.applicationsByCategory[category_menu_id];
            	// global.log("menyy: getting applist category")
            } else {
            	// global.log("menyy: getting applist else")
            	applist = this._allAppsList;
            }        
        }
        let res; // Results array

        // Get search results based on pattern (query)
        if (pattern) {
            let searchResults = new Array();
            for (let i in applist) {
                let app = applist[i];
                let info = Gio.DesktopAppInfo.new (app.get_id());
                let match = app.get_name().toLowerCase() + " ";
                if (info.get_display_name()) match += info.get_display_name().toLowerCase() + " ";
                if (info.get_executable()) match += info.get_executable().toLowerCase() + " ";
                if (info.get_keywords()) match += info.get_keywords().toString().toLowerCase() + " ";
                if (app.get_description()) match += app.get_description().toLowerCase();
                let index = match.indexOf(pattern)
                if (index != -1) {
                    searchResults.push([index, app]);
                }
            }

            // Sort results by relevance score
            searchResults.sort(function(a,b) {
                return a[0] > b[0];
            });
            res = searchResults.map(function(value,index) { return value[1]; });
        } else {
            applist.sort(function(a,b) {
                return a.get_name().toLowerCase() > b.get_name().toLowerCase();
            });
            res = applist;
        }
        // global.log("menyy: " + res);
	    return res;
    },
    
    
    // Handle search text entry input changes
    _onSearchTextChanged: function (se, prop) {
        let searchString = this.searchEntry.get_text();
        this.searchActive = searchString != '';
        if (this.searchActive) {
            this.searchEntry.set_secondary_icon(this._searchActiveIcon);
            if (this._searchIconClickedId == 0) {
                this._searchIconClickedId = this.searchEntry.connect('secondary-icon-clicked',
                    Lang.bind(this, function() {
                        this.resetSearch();
                        this._openDefaultCategory();
                    }));
            }
            this._doSearch();
            //this._doAsyncSearch();
            
        } else {
            if (this._searchIconClickedId > 0)
                this.searchEntry.disconnect(this._searchIconClickedId);
            this._searchIconClickedId = 0;
            this.searchEntry.set_secondary_icon(null);
            if (searchString == "" && this._previousSearchPattern != "") {
            	this._openDefaultCategory();
            }
            this._previousSearchPattern = "";
        }
        return false;
    },

    // Carry out a search based on the search text entry value
    _doSearch: function(){
        let pattern = this.searchEntryText.get_text().replace(/^\s+/g, '').replace(/\s+$/g, '').toLowerCase();
        if (pattern==this._previousSearchPattern) return;
        this._previousSearchPattern = pattern;
        if (pattern.length == 0) {
            return;
        }
        let appResults = this._listApplications(null, pattern);
        this._clearAppsBox();
        this._displayButtons(appResults);
        
        if (searchFixed) {
        if (this.appsBox.get_children().length > 0)
            global.stage.set_key_focus(this.appsBox.get_first_child());
        }
        if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
        	this.backButton.actor.show();
        	this.backToButton.actor.hide();
        	this.goToButton.actor.hide();
        }
    },
    
    
    /*
	 * _doAsyncSearch: function() { GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500,
	 * function () { button._doSearch(); return false; // Don't repeat }, null); },
	 */
    _doAsyncSearch: function() {
    	GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, this._doSearch(), null);
    },
    

    // Reset the search
    resetSearch: function(){
        this.searchEntry.set_text("");
        this.searchActive = false;
        global.stage.set_key_focus(this.searchEntry);
     },
    
    
    
    // Destroy the menu button
    _onDestroy: function() {
        Main.overview.disconnect(this._showingId);
        Main.overview.disconnect(this._hidingId);
        Main.layoutManager.disconnect(this._panelBoxChangedId);
        appSys.disconnect(this._installedChangedId);
    },

    // Handle captured event
    _onCapturedEvent: function(actor, event) {
        if (event.type() == Clutter.EventType.BUTTON_PRESS) {
            if (!Main.overview.shouldToggleByCornerOrButton())
                return true;
        }
        return false;
    },
    
    //Change this relay later
    _openDefaultCategory: function(){
    	this._selectCategory('default');
    },
    
    
    /*
    _openDefaultCategory: function() {
    	this.homeScrollBox.show();
    	this.appsScrollBox.hide();
    	this._selectCategory('default');
    	*/
    	/*
    	if (defaultCategory == 0) {
    		this._selectCategory(null);
    	} else if (defaultCategory == 1) {
	 	   this._selectCategory('frequent');
	    } else if (defaultCategory == 2) {
	 	   this._selectCategory('favorites');
	    } else if (defaultCategory == 3) {
	 	   this._selectCategory('menyy');
	    } else if (defaultCategory == 4) {
	 	   this._selectCategory('all');
	    } else if (defaultCategory == 5) {
	 	   this._selectCategory('recent');
	    } else if (defaultCategory == 6) {
	 	   this._selectCategory('categories');
	    } else if (defaultCategory == 7) {
	 	   this._selectCategory('myfav');
	    }
	    */
    /*
    },*/
    
	// Handle changes in menu open state
	_onOpenStateChanged: function(menu, open) {
		this._clearCategoryBox();
		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			// do something probably
		} else {
			this._loadCategories();
		}
	   if (open) {
	       if (this.reloadFlag) {
	           this._redisplay();
	           this.reloadFlag = false;
	       }
	       this.mainBox.show();
	   }
	   this._openDefaultCategory();
	   this.parent(menu, open);
	},

    // Redisplay the menu
    _redisplay: function() {
        if (this.appsBox)
            this.appsBox.destroy_all_children();
        if (this.categoryBox)
            this.categoryBox.destroy_all_children();
        this._display();
    },
    
    
    _getLayout: function() {
    	return this.mainBox();
    },
    
    
    _setApplications: function(item) {
    	this.appsBox.add(item);
    },
    
    // Display the menu
    _display: function() {
        this.mainBox.hide();
        if (this._settings.get_enum('visible-menus') != visibleMenus.SYSTEM_ONLY) {
            this._applicationsButtons = new Array();
            this._clearCategoryBox();
            this._loadCategories();
            
            
            
            
            
            
         	// selectedAppBox
            // this.selectedAppBox = new St.BoxLayout({ style_class:
			// 'gnomenu-selected-app-box', vertical: true });
            // this.selectedAppTitle = new St.Label({ style_class:
			// 'gnomenu-selected-app-title', text: "" });
            // this.selectedAppBox.add_actor(this.selectedAppTitle);
            // this.selectedAppDescription = new St.Label({ style_class:
			// 'gnomenu-selected-app-description', text: "" });
            // this.selectedAppBox.add_actor(this.selectedAppDescription);
            this._previousSearchPattern = "";
            if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
            	this.backButton.actor.hide();
            	this.backToButton.actor.hide();
            	this.goToButton.actor.hide();
            }
        }
    }

});
