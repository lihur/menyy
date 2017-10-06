//Gnome-Shell and GTK files
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

//const Meta = imports.gi.Meta;										// DesktopTarget
//const DND = imports.ui.dnd;											// DesktopTarget



//My extension files
const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const systemButtons = Menyy.imports.systemButtons;
const menuButtons = Menyy.imports.menuButtons;
const placeDisplay = Menyy.imports.managers.placeDisplay;
const commandLineDisplay = Menyy.imports.managers.commandLineDisplay;
const convenience = Menyy.imports.convenience;
const MenuButtonWidget = Menyy.imports.menuWidget.MenuButtonWidget;

// Web bookmarks support
const Chromium = Menyy.imports.managers.webChromium;
//const Epiphany = Menyy.imports.managers.webEpiphany;
const Firefox = Menyy.imports.managers.webFirefox;
const GoogleChrome = Menyy.imports.managers.webGoogleChrome;
const Midori = Menyy.imports.managers.webMidori;
const Opera = Menyy.imports.managers.webOpera;
const DesktopTarget = Menyy.imports.managers.DnD.DesktopTarget;
Signals.addSignalMethods(DesktopTarget.prototype);

//SystemButtons
const PowerButton = systemButtons.PowerButton;
const ShellButton = systemButtons.ShellButton;
const LogoutButton = systemButtons.LogoutButton;
const SuspendButton = systemButtons.SuspendButton;
const LockButton = systemButtons.LockButton;

//MenuButtons
const CategoryButton = menuButtons.CategoryButton;
const AppButton = menuButtons.AppButton;
const ShortcutButton = menuButtons.ShortcutButton;				// Right click for menu uses it
const UserMenuItem = menuButtons.UserMenuItem;
const BackMenuItem = menuButtons.BackMenuItem;

//LOOK settings
var LocationHorizontal = 0; 
var LocationVertical = 0;
var SearchLocation = 0;
var CategoryLocation = 0;
var defaultCategory = 1;


const constants = Menyy.imports.constants;
const AppType = constants.AppType;
const visibleMenus = constants.visibleMenus;
const ApplicationsViewMode = constants.ApplicationsViewMode;
const CategoriesViewMode = constants.CategoriesViewMode;
const PlacesViewMode = constants.PlacesViewMode;
const SelectMethod = constants.SelectMethod;
const HomeView = constants.HomeView;

// TODO(MOVE TO A SEPARATE FILE)
// Searches web bookmarks
const SearchWebBookmarks = new Lang.Class({
    Name: 'Menyy.SearchWebBookmarks',

    _init: function() {
        Chromium.init();
        //Epiphany.init();
        Firefox.init();
        GoogleChrome.init();
        Midori.init();
        Opera.init();
    },

    bookmarksSort: function(a, b) {
        //if (a.score < b.score) return 1;
        //if (a.score > b.score) return -1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    },

    destroy: function() {
        Chromium.deinit();
        //Epiphany.deinit();
        Firefox.deinit();
        GoogleChrome.deinit();
        Midori.deinit();
        Opera.deinit();
    }
});




//Aplication Popup Menu Class
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
			//global.stage.set_key_focus(this._button.searchBox);
		}
	},


	// Handle closing the menu
	close: function(animate) {
		let size = Main.layoutManager.panelBox.height;
		global.stage.set_key_focus(null);
		if (this._button.appsBox) {
			this._button._selectCategory(null);
			this._button.resetSearch();
		}
		this.parent(animate);
	}
});


//Applications Menu class (which is called a button for some reason)
const ApplicationsMenu = new Lang.Class({
	Name: 'ApplicationsMenu',
	Extends: PanelMenu.Button,

	// Init
	_init: function(settings) {
		this._settings = settings;
		this.parent(1.0, null, false);
		this._session = new GnomeSession.SessionManager();

		// Lists and other variables
		this.toggleMenuFlag = true;
		this.reloadFlag = false;																		// Reload later flag
		this.searchActive = false;																		//
		this.currentCategory = null;																	// Current Category (for reloading changes)
		this.placesManager = null;																		// Places Manager
		this.commandLineManager = null;																	// Terminal Commands Manager
		this.searchEntryText = null;																	// Search text that will get entered by user
		this._searchIconClickedId = 0;																	// 
		this._searchTimeoutId = 0;																		// Used to make search wait for new input
		
		this._activeContainer = null;																	// Destroy me later maybe?

		this.applicationsByCategory = {};																// applications in categories
		this._allAppsList = {};																// All Apps list
		this._frequentApps = new Array();																// Frequent Apps List
		this._favorites = new Array();																	// Favorite Apps List
		this._places = new Array();																		// Places List
		this._recent = new Array();																		// Recent Files List
		
		// Settings
		//this._searchWaitTime = this._settings.get_int('search-timeout-time');							// Put in setting, this is used to determine how long search waits for new input
		this._appGridColumns = this._settings.get_int('apps-grid-column-count');						// Grid Column Count
		this._appsViewMode = this._settings.get_enum('apps-viewmode');									// Apps View Mode (grid or list or other)
		this._categoriesViewMode = this._settings.get_enum('categories-viewmode');						// Categories View Mode (left, right, combined with apps or accordion)
		this._placesViewMode = this._settings.get_enum('places-viewmode');								// Places viewmode
		this._appGridButtonWidth = 20 + (settings.get_int('grid-icon-size'));							// grid icon size in px
		this.hoverDelay =  this._settings.get_int('categories-hover-delay');							// hoverDelay
		this.HomeViewSettings = this._settings.get_enum('default-category');							// Default category to open

		// Panel button stuff
		this._menuButtonWidget = new MenuButtonWidget();
		this.actor.add_actor(this._menuButtonWidget);
		this.setMenu(new ApplicationsPopupMenu(this.actor, 1.0, St.Side.TOP, this, this._settings));
		
		// Web Browser Search stuff
        this._searchWebBookmarks = new SearchWebBookmarks();
        this._searchWebErrorsShown = false;
        
        // Recent files stuff
        this.recentManager = Gtk.RecentManager.get_default();
		// Run functions
		this._firstCreateLayout();
		this._display();																				// 
		// Load stuff into memory for a minor speed improvement
		this._loadFavorites();																			// Load Favorites into memory
		this._loadFrequent();																			// Load Frequent into memory
		this._loadHome();																				// Load homescreen applications into memory		
		/*
		Main.panel.actor.connect('notify::height', Lang.bind(this,
				function() {
			this._redisplay();
		}));*/

		//Drag to desktop
		this._desktopTarget = new DesktopTarget();
		this._desktopTarget.connect('app-dropped', () => {
			this.menu.close();
		});
		this._desktopTarget.connect('desktop-changed', () => {
			this._appsButtons.forEach(item => {
				item.setDragEnabled(this._desktopTarget.hasDesktop);
			});
		});


		// Left or right click menu option?
		this.actor.connect('button-press-event', Lang.bind(this,
				this._onButtonPressEvent));
		this.actor.connect('button-release-event', Lang.bind(this,
				this._onButtonReleaseEvent));

		this.actor.connect('destroy', Lang.bind(this, this._onDestroy));								// Run this if Menu is destroyed!
	},

	_onButtonPressEvent: function(actor, event){
		actor.add_style_pseudo_class('pressed');
		let button = event.get_button();
		if (button == 1) {
			this.mainBox.show();
			this.altBox.hide();
			return Clutter.EVENT_STOP;
		} else if (button == 3) {
			this.mainBox.hide();
			this.altBox.show();
			return Clutter.EVENT_STOP;
		}
		return Clutter.EVENT_PROPAGATE;
	},
	_onButtonReleaseEvent: function(actor, event){
		//this._removeMenuTimeout();
		actor.remove_style_pseudo_class('pressed');
		//actor.remove_style_class_name('selected');
		//let button = event.get_button();
		//if (button != 3) {
		//    this.activate(event);
		//}
		return Clutter.EVENT_STOP;
	},

	// Create the menu layout
	_firstCreateLayout: function() {
		let section = new PopupMenu.PopupMenuSection();
		this.menu.addMenuItem(section);

		// Main menu inside this box!
		this.mainBox = new St.BoxLayout({ vertical: true,
			style_class: 'menyy-main-box menyy-spacing' });

		// Alternative (right click) menu inside this box!
		this.altBox = new St.BoxLayout({ vertical: true,
			style_class: 'menyy-alt-box menyy-spacing' });


		// ADDS menu and right click menu to the button
		section.actor.add_actor(this.mainBox);
		section.actor.add_actor(this.altBox, {expand: true, x_fill: true, y_fill: true});
		this.altBox.hide();																		//maybe it'll fix the bug of both boxes showing sometimes?

		this._createLayout();
		//this._createAltLayout();
	},

	// Right Click Menu
	_createAltLayout: function() {
		this.rightClickBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-rightClick-box menyy-spacing', x_align: St.Align.END});
		this.altBox.add(this.rightClickBox, {expand: true, x_fill: true, y_fill: true});


		//Load the friggin Menu!
		this._loadRightClick();		
	},

	_createLayout: function() {
		// Menu Vertical layout!
		this.topBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-top-box menyy-spacing' });
		this.centerBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-center-box menyy-spacing' , y_align: St.Align.END });		// NOT USED YET
		this.bottomBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-bottom-box menyy-spacing' , y_align: St.Align.END });

		// Categories, Applications, Places part of Horizontal layout
		this.leftBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-left-box menyy-spacing', x_align: St.Align.END});
		//this.middleBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-middle-box menyy-spacing', x_align: St.Align.END});
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
		this.systemBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-system-box', y_align: St.Align.END });
		this.systemBoxMenu = new PopupMenu.PopupBaseMenuItem({ reactive: false,
			can_focus: false, style_class: 'menyy-system-box menyy-spacing'});

		// Categories, main display, places and homescreen
		// Always create the box... it's not like it's gonna slow it down or chug memory
		this.categoryBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-categories-box-inside menyy-spacing' });
		if (this._appsViewMode == ApplicationsViewMode.LIST) { // ListView
			// Apps Box
			this.appsBox = new St.BoxLayout({vertical: true, style_class: 'menyy-applications-box menyy-spacing' });
			this.appsBoxWrapper = this.appsBox;

			// Home Box
			this.homeBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-home-box' });
			this.homeBoxWrapper = this.homeBox;
		} else {
			// Apps Box
			this.appsBox = new St.Widget({ layout_manager: new Clutter.TableLayout(), reactive:true, style_class: 'menyy-applications-box-grid'});
			this.appsBoxWrapper = new St.BoxLayout({ style_class: 'menyy-applications-box-wrapper' });
			this.appsBoxWrapper.add(this.appsBox, {x_fill:false, y_fill: false, x_align: St.Align.START, y_align: St.Align.START});

			// Home Box
			this.homeBox =  new St.Widget({ layout_manager: new Clutter.TableLayout(), reactive:true, style_class: 'menyy-home-box-grid'});
			this.homeBoxWrapper = new St.BoxLayout({ style_class: 'menyy-applications-box-wrapper' });
			this.homeBoxWrapper.add(this.homeBox, {x_fill:false, y_fill: false, x_align: St.Align.START, y_align: St.Align.START});
		}
		this.placesBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-places-box menyy-spacing'});

		// Apps Scroll
		this.appsScrollBox = new St.ScrollView({x_fill: true, y_fill: true, y_align: St.Align.START, style_class: 'vfade menyy-applications-box-scrollview' });
		this.appsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		vScrollApps = this.appsScrollBox.get_vscroll_bar();
		vScrollApps.connect('scroll-start', Lang.bind(this, function() {
			this.menu.passEvents = true;
		}));
		vScrollApps.connect('scroll-stop', Lang.bind(this, function() {
			this.menu.passEvents = false;
		}));
		this.appsScrollBox.add_actor(this.appsBoxWrapper);




		// Home Scroll
		this.homeScrollBox = new St.ScrollView({x_fill: true, y_fill: true, y_align: St.Align.START, style_class: 'vfade menyy-applications-box-scrollview' });
		this.homeScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		vScrollHome = this.homeScrollBox.get_vscroll_bar();
		vScrollHome.connect('scroll-start', Lang.bind(this, function() {
			this.menu.passEvents = true;
		}));
		vScrollHome.connect('scroll-stop', Lang.bind(this, function() {
			this.menu.passEvents = false;
		}));
		
		this.homeScrollBox.add_actor(this.homeBoxWrapper);




		// Categories Scroll
		if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
			this.categoryScrollBox = new St.ScrollView({y_align: St.Align.START,
				style_class: 'menyy-categories-box-scrollview menyy-spacing' });
			this.categoryScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
			vScrollCategories = this.categoryScrollBox.get_vscroll_bar();
			vScrollCategories.connect('scroll-start', Lang.bind(this, function() {
				this.menu.passEvents = true;
			}));
			vScrollCategories.connect('scroll-stop', Lang.bind(this, function() {
				this.menu.passEvents = false;
			}));
			this.categoryScrollBox.add_actor(this.categoryBox);
		}




		// Places Scroll
		this.placesScrollBox = new St.ScrollView({x_fill: true, y_fill: true, y_align: St.Align.START, style_class: 'vfade menyy-places-box-scrollview' });
		this.placesScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		vScrollPlaces = this.placesScrollBox.get_vscroll_bar();
		vScrollPlaces.connect('scroll-start', Lang.bind(this, function() {
			this.menu.passEvents = true;
		}));
		vScrollPlaces.connect('scroll-stop', Lang.bind(this, function() {
			this.menu.passEvents = false;
		}));
		this.placesScrollBox.add_actor(this.placesBox);


		// Add Home and Apps into a container
		this.appsScrollBoxContainer = new St.BoxLayout({ vertical: true, style_class: 'menyy-top-box menyy-spacing' });
		this.appsScrollBoxContainer.add(this.appsScrollBox, {expand: true});
		this.appsScrollBoxContainer.add(this.homeScrollBox, {expand: true});

		// Add Vertical layout boxes
		this.mainBox.add(this.topBox);
		this.mainBox.add(this.centerBox);
		this.mainBox.add(this.bottomBox);


		// Add to top or bottom
		// TODO(REDO THIS WHOLE PART FOR IMPROVED CUSTOMIZEABILITY
		if (LocationHorizontal == 0) {
			this.bottomBox.add(this.searchBox, {expand: true, x_fill: true, y_fill: false,
				y_align: St.Align.MIDDLE });
			this.bottomBox.add(this.systemBox, { expand: false,
				x_fill: true, y_fill: false,
				y_align: St.Align.END });
			this.topBox.add(this.leftBox);
			this.topBox.add(this.rightBox);
		} else {
			this.topBox.add(this.searchBox, {expand: true, x_fill: true, y_fill: true,
				y_align: St.Align.START });
			this.topBox.add(this.systemBox, { expand: false,
				x_fill: true, y_fill: false,
				y_align: St.Align.MIDDLE });
			this.bottomBox.add(this.leftBox);
			this.bottomBox.add(this.rightBox);
		}

		// add a check on which side the places are or if shown
		if (this._placesViewMode == PlacesViewMode.RIGHT) {
			if (this._categoriesViewMode == CategoriesViewMode.LEFT) {
				this.leftBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
			} else if (this._categoriesViewMode == CategoriesViewMode.RIGHT) {
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
				this.leftBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
			} else if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });			
			} else { // currently no accordion option
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });			
			}
			this.rightBox.add(this.placesScrollBox);
		} else if (this._placesViewMode == PlacesViewMode.LEFT){
			if (this._categoriesViewMode == CategoriesViewMode.LEFT) {
				this.rightBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
				this.rightBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
			} else if (this._categoriesViewMode == CategoriesViewMode.RIGHT) {
				this.rightBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
				this.rightBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
			} else if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
				this.rightBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });			
			} else { // currently no accordion option
				this.rightBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });			
			}
			this.leftBox.add(this.placesScrollBox);
		} else {
			if (this._categoriesViewMode == CategoriesViewMode.LEFT) {
				this.leftBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
			} else if (this._categoriesViewMode == CategoriesViewMode.RIGHT) {
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });
				this.leftBox.add(this.categoryScrollBox, {expand: true, x_fill: true, y_fill: true, y_align: St.Align.START });
			} else if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });			
			} else { // currently no accordion option
				this.leftBox.add(this.appsScrollBoxContainer, {y_align: St.Align.START });			
			}
			this.rightBox.add(this.placesScrollBox);
			// Just hide the box for now
			this.placesScrollBox.hide();
		}

		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			this.backContainBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-backContainBox', y_align: St.Align.END });
			this.backButton = new BackMenuItem(this, 'backtoCategories');
			this.backToButton = new BackMenuItem(this, 'backToHome');
			this.goToButton = new BackMenuItem(this, 'goToCategories');
			this.backContainBox.add(this.backButton.actor, { expand: true,
				x_fill: true, y_fill: false,
				y_align: St.Align.START });
			this.backContainBox.add(this.backToButton.actor, { expand: true,
				x_fill: true, y_fill: false,
				y_align: St.Align.START });
			this.backContainBox.add(this.goToButton.actor, { expand: true,
				x_fill: true, y_fill: false,
				y_align: St.Align.START });
			this.appsScrollBoxContainer.add(this.backContainBox, {x_fill: true});
		}





		// Add system buttons to menu
		/*
		 * let shellrestart = new ShellButton(this);
		 * this.systemBox.add(shellrestart.actor, { expand: false, x_fill:
		 * false, y_align: St.Align.START });
		 */

		let logout = new LogoutButton(this);
		this.systemBox.add(logout.actor, { expand: false,
			x_fill: false,
			y_align: St.Align.START
		});

		if (Main.screenShield !== null) {
			let lock = new LockButton(this); this.systemBox.add(lock.actor, { expand: false, x_fill: false, y_align: St.Align.START });
			this.systemBox.add(lock.actor, { expand: false,
				x_fill: false,
				y_align: St.Align.START
			});
		}

		let suspend = new SuspendButton(this);
		this.systemBox.add(suspend.actor, { expand: false,
			x_fill: false,
			y_align: St.Align.START
		});

		let power = new PowerButton(this);
		this.systemBox.add(power.actor, { expand: false,
			x_fill: false,
			y_align: St.Align.START
		});


		let user = new UserMenuItem(this);
		this.placesBox.add(user.actor, { expand: false,
			x_fill: true,
			y_fill: false,
			y_align: St.Align.START
		});
		// RUN FUNCTIONS
		this._createAltLayout();		// For the time being, creates this layout here as well
		this._loadPlaces();				// ADDS PLACES to PLACES MENU
		this._setLayoutSizes();			// LOADS LAYOUT SETTINGS
	},


	// When layout needs to be recreated
	_reCreateLayout: function() {
		// DESTROY WHOLE LAYOUT!
		let actors = this.mainBox.get_children();
		for (let i = 0; i < actors.length; i++) {
			let actor = actors[i];
			this.mainBox.remove_actor(actor);
		}
		
		let actors2 = this.rightClickBox.get_children();
		for (let i = 0; i < actors2.length; i++) {
			let actor = actors2[i];
			this.rightClickBox.remove_actor(actor);
		}

		// RELOAD LAYOUT RELATED SETTINGS!
		this._appsViewMode = this._settings.get_enum('apps-viewmode');
		this._placesViewMode = this._settings.get_enum('places-viewmode');
		this._categoriesViewMode = this._settings.get_enum('categories-viewmode');
		this._appGridColumns = this._settings.get_int('apps-grid-column-count');
		this._appGridButtonWidth = 20 + (this._settings.get_int('grid-icon-size') > 0) ? this._settings.get_int('grid-icon-size') : 52;

		// CREATE LAYOUT
		this._createLayout();
		this._loadHome();
	},
	
	
	_setDefaultCategory: function() {
		global.log("menyy homeview pre: " + this.HomeViewSettings);
		this.HomeViewSettings = this._settings.get_enum('default-category');				// Default category to open
		global.log("menyy homeview aft: " + this.HomeViewSettings);
		this._loadHome();
	},


	// Sets layout size according to settings
	// TODO(MAKE CLEANER VERSION OF LAYOUT STYLE FUNCTION)
	_setLayoutSizes: function() {
		let appsWidth;
		// Set layout sizes
		this.appsScrollBoxContainer.set_style(
				'height: ' + (this._settings.get_int('menubox-height')).toString() + 'px'
		);
		
		if (this._appsViewMode == ApplicationsViewMode.GRID) {
			appsWidth = (this._appGridButtonWidth + 40) * this._appGridColumns;		// (grid button size + padding) * columns
		} else {
			appsWidth = this._settings.get_int('appsbox-width');
		}
		
		this.appsBoxWrapper.set_style( 'width: ' + appsWidth + 'px' );
		this.homeBoxWrapper.set_style( 'width: ' + appsWidth + 'px' );
		
		
		/*
		 * Scroll settings
		 */
		let vScrollApps;
		let vScrollHome;
		let vScrollCategories;
		let vScrollPlaces;
		if (this._settings.get_boolean('show-apps-scrollbar') == true) {
			vScrollApps = this.appsScrollBox.get_vscroll_bar();
			vScrollHome = this.homeScrollBox.get_vscroll_bar();
			
			vScrollApps.show();
			vScrollHome.show();
		} else {
			vScrollApps = this.appsScrollBox.get_vscroll_bar();
			vScrollHome = this.appsHomeBox.get_vscroll_bar();
			
			vScrollApps.hide();
			vScrollHome.hide();
		}
		if (this._settings.get_boolean('show-categories-scrollbar') == true) {
			if (this.categoriesScrollBox) vScrollCategories = this.categoriesScrollBox.get_vscroll_bar();
			
			if (vScrollCategories) this.vScrollCategories.show();
		} else {
			if (this.categoriesScrollBox) vScrollCategories = this.categoriesScrollBox.get_vscroll_bar();
			
			if (vScrollCategories) this.vScrollCategories.hide();
		}
		if (this._settings.get_boolean('show-places-scrollbar') == true) {
			vScrollPlaces = this.placesScrollBox.get_vscroll_bar();
			
			vScrollPlaces.show();
		} else {
			vScrollPlaces = this.placesScrollBox.get_vscroll_bar();
			
			vScrollPlaces.hide();
		}
		
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
		
		
		
		
		// Right Click
		this.rightClickBox.set_style(
				'min-height: 0px; ' +
				'max-height: 900px ;' +		// TODO(CONNECT this to screen resolution)
				'min-width: 290px; ' + 		// Trial and error to see an appropriate one :D
				'max-width: 900px; '		// TODO(CONNECT this to screen resolution)
		);
	},
	
	
    // Scroll to a specific button (menu item) in the applications scroll view
    _scrollToActiveContainerButton: function(buttonActor) {
        let sBox;
        if (this._activeContainer == this.placesBox) {
            sBox = this.placesScrollBox;
        } else if (this._activeContainer == this.appsBox) {
            sBox = this.appsScrollBox;
        } else if (this._activeContainer == this.homeBox) {
        	sBox = this.homeScrollBox;
        } else if (this._activeContainer == this.categoryBox) {
        	sBox = this.categoryScrollBox;
        } else {
            return;
        }
        let vscroll = sBox.get_vscroll_bar();
        let buttonBox = buttonActor.get_allocation_box();      
        let sBoxAdj = sBox.get_vscroll_bar().get_adjustment();
        let sBoxAlloc = sBox.get_allocation_box();
        let currentScrollValue = sBoxAdj.get_value();
        let boxHeight = sBoxAlloc.y2 - sBoxAlloc.y1;
        let buttonAlloc = buttonActor.get_allocation_box();
        let newScrollValue = currentScrollValue;
        if (currentScrollValue > buttonAlloc.y1 - 10) {
            newScrollValue = buttonAlloc.y1 - 10;
        }
        if (boxHeight + currentScrollValue < buttonAlloc.y2 + 10) {
            newScrollValue = buttonAlloc.y2 - boxHeight + 10;
        }
        if (newScrollValue != currentScrollValue) {
        	sBoxAdj.set_value(newScrollValue);
    	}
		/*
        var current_scroll_value = vscroll.get_adjustment().get_value();
        var box_height = sBox.get_allocation_box().y2-sBox.get_allocation_box().y1;
        var new_scroll_value = current_scroll_value;

        if (current_scroll_value > buttonBox.y1-20) new_scroll_value = buttonBox.y1-20;
        if (box_height+current_scroll_value < buttonBox.y2+20) new_scroll_value = buttonBox.y2-box_height+20;
        if (new_scroll_value!=current_scroll_value) vscroll.get_adjustment().set_value(new_scroll_value);
        */
    },
	
	
	/* Keyboard Input Starts Here */
	
	// Keyboard navigation
    _onMenuKeyPress: function(actor, event) {
        let symbol = event.get_key_symbol();
        let code = event.get_key_code();
        let modifiers = event.get_state();
        let shift = modifiers & Clutter.ModifierType.SHIFT_MASK;
        
        let reverse;
        if (code == 23 && shift)
            reverse = true;
        
        //global.log("menyy -> onMenuKeyPress: " + code);
        // code 111 is up
        // code 116 is down
        // code 113 is left
        // code 114 is right
        // code 23 is tab
        
		///////////////////////////////////////////
		//Current Layout looks kind of like this!//
        ///////////////////////////////////////////
		//section--------------------------------//
		//--|>mainBox----------------------------//
		//--|---|>topBox-------------------------//
		//--|---|---|>leftbox--------------------//
		//--|---|---|---|>appsScrollBoxContainer-//
		//--|---|---|---|---|>appsScrollBox------//
		//--|---|---|---|---|---|>appsBoxWrapper-//
		//--|---|---|---|---|-------|>appsBox----//
		//--|---|---|---|---|>homeScrollBox------//
		//--|---|---|---|---|---|>homeBoxWrapper-//
		//--|---|---|---|---|-------|>homeBox----//
		//--|---|---|---|>backButton-------------//
		//--|---|---|---|>backToButton-----------//
		//--|---|---|---|>goToButton-------------//
		//--|---|---|>rightBox-------------------//
		//--|---|-------|>placesScrollBox--------//
		//--|---|-----------|>placesBox----------//
		//--|---|>centerBox----------------------//
		//--|---|>bottomBox----------------------//
		//--|-------|>searchBox------------------//
		//--|-------|---|>searchEntry------------//
		//--|-------|>systemBox------------------//
		//--|>altBox-----------------------------//
		//------|>rightClickBox------------------//
		///////////////////////////////////////////
        
        //global.log("menyy: activeContainer: " + this._activeContainer);
        // Tab navigation
        let debugMe = false;
        if (code == 23) {
            if (this._activeContainer) {
                this._clearActiveContainerSelections();
            }
            switch (this._activeContainer) {
            	// Add fixed choices only for now .... categoryBox -> apps-> -> backContain places -> search -> system
            	case this.categoryBox:
            		if (reverse) {
            			this._activeContainer = this.systemBox;
            				if (debugMe) (global.log("menyy -> selected container: categoryBox -> systemBox"));
            		} else {
            			if (this.currentCategory == 'default') {
                			this._activeContainer = this.homeBox;
                			if (debugMe) (global.log("menyy -> selected container: categoryBox -> homeBox"));
            			} else {
            				this._activeContainer = this.appsBox;
            				if (debugMe) (global.log("menyy -> selected container: categoryBox -> appsBox"));
            			}
            		}
            	break;
            	case this.appsBox:
            		if (reverse) {
            			if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
            				this._activeContainer = this.systemBox;
            				if (debugMe) (global.log("menyy -> selected container: appsBox -> systemBox"));
            			} else {
            				this._activeContainer = this.categoryBox;
            				if (debugMe) (global.log("menyy -> selected container: appsBox -> categoryBox"));
            			}
            		} else {
            			if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
            				this._activeContainer = this.backContainBox;
            				if (debugMe) (global.log("menyy -> selected container: appsBox -> backContainBox"));
            			} else {
	            			// check if places shown aftewards
	            			this._activeContainer = this.placesBox;
            				if (debugMe) (global.log("menyy -> selected container: appsBox -> placesBox"));
            			}
            		}
            	break;
            	case this.homeBox:
            		if (reverse) {
            			if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
            				this._activeContainer = this.systemBox;
            					if (debugMe) (global.log("menyy -> selected container: homeBox -> systemBox"));
            			} else {
            				this._activeContainer = this.categoryBox;
            					if (debugMe) (global.log("menyy -> selected container: homeBox -> categoryBox"));
            			}
            		} else {
            			if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
            				this._activeContainer = this.backContainBox;
            				if (debugMe) (global.log("menyy -> selected container: homeBox -> backContainBox"));
            			} else {
	            			// check if places shown aftewards
	            			this._activeContainer = this.placesBox;
            				if (debugMe) (global.log("menyy -> selected container: homeBox -> placesBox"));
            			}
            		}
            	break;
            	case this.backContainBox:
            		if (reverse) {
            			if (this.currentCategory == 'default') {
                			this._activeContainer = this.homeBox;
                				if (debugMe) (global.log("menyy -> selected container: backContainBox -> homeBox"));
            			} else {
            				this._activeContainer = this.appsBox;
            					if (debugMe) (global.log("menyy -> selected container: backContainBox -> appsBox"));
            			}
            		} else {
            			// check if places shown aftewards
            					this._activeContainer = this.placesBox;
            					if (debugMe) (global.log("menyy -> selected container: backContainBox -> placesBox"));
            		}
            	break;
            	case this.placesBox:
            		if (reverse) {
            			if (this.currentCategory == 'default') {
                			this._activeContainer = this.homeBox;
                				if (debugMe) (global.log("menyy -> selected container: placesBox -> homeBox"));
            			} else {
            				this._activeContainer = this.appsBox;
            					if (debugMe) (global.log("menyy -> selected container: placesBox -> appsBox"));
            			}
            		} else {
            			// check if places shown aftewards
            			this._activeContainer = this.searchBox;
            					if (debugMe) (global.log("menyy -> selected container: placesBox -> searchBox"));
            		}
            	break;
            	case this.searchBox:
            		if (reverse) {
            			// check if places shown aftewards
            			this._activeContainer = this.placesBox;
            					if (debugMe) (global.log("menyy -> selected container: searchBox -> placesBox"));
            		} else {
            			this._activeContainer = this.systemBox;
            					if (debugMe) (global.log("menyy -> selected container: searchBox -> systemBox"));
            		}
            	break;
            	case this.systemBox:
            		if (reverse) {
            			this._activeContainer = this.searchBox;
            					if (debugMe) (global.log("menyy -> selected container: systemBox -> searchBox"));
            		} else {
            			if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
                			if (this.currentCategory == 'default') {
                    			this._activeContainer = this.homeBox;
                    			if (debugMe) (global.log("menyy -> selected container: systemBox -> homeBox"));
                			} else {
                				this._activeContainer = this.appsBox;
                				if (debugMe) (global.log("menyy -> selected container: systemBox -> appsBox"));
                			}
            			} else {
            				this._activeContainer = this.categoryBox;
            					if (debugMe) (global.log("menyy -> selected container: systemBox -> categoryBox"));
            			}
            		}
            	break;
                default:
            		if (reverse) {
            			// check if places shown aftewards
            			this._activeContainer = this.placesBox;
            				if (debugMe) (global.log("menyy -> selected container: undefined -> placesBox"));
            		} else {
            			this._activeContainer = this.systemBox;
            				if (debugMe) (global.log("menyy -> selected container: undefined -> systemBox"));
            		}
            }
            this._clearTabFocusSelections(this._activeContainer, true);
            this.selectActiveContainerItem(symbol, code);
            
            //global.log("menyy -> selected container: " + this._activeContainer[0]);
            
            return true;
        }

        // Set initial active container (default is this.applicationsListBox or this.applicationsGridBox)
        if (this._activeContainer === null && (symbol == Clutter.KEY_Up || symbol == Clutter.KEY_Down)) {
           // this._activeContainer = (viewMode == ApplicationsViewMode.LIST) ? this.applicationsListBox : this.applicationsGridBox;
        	this._activeContainer = this.appsBox;
        } else if (this._activeContainer === null && (symbol == Clutter.KEY_Left || symbol == Clutter.KEY_Right)) {
            //this._activeContainer = (viewMode == ApplicationsViewMode.LIST) ? this.applicationsListBox : this.applicationsGridBox;
        	this._activeContainer = this.appsBox;
        } else if (this._activeContainer === null) {
            return false;
        }
        
        if (this.selectActiveContainerItem(symbol, code)) {
            return true;
        } else {
            this._clearActiveContainerSelections();
            return false;
        }
    },
    
    selectActiveContainerItem: function(symbol, code, isFromSearch) {
        // Any items in container?
        let children = new Array();
        if (this._activeContainer.get_children) {
            children = this._activeContainer.get_children();
        }
        if (children.length==0){
            this._selectedItemIndex = -1;
        }
        

        // Get selected item index
        let index = this._selectedItemIndex;
        this._previousSelectedItemIndex = this._selectedItemIndex;
        
        if (this._selectedItemIndex == null || this._selectedItemIndex < 0) {
            index = 0;
        }
        // Navigate the active container
        if (symbol && symbol == Clutter.KEY_Up) {
            if (this._selectedItemIndex != null && this._selectedItemIndex > -1) {
            	// If home or apps in grid mode
                if (((this._activeContainer == this.appsBox) ||(this._activeContainer == this.homeBox)) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
                    var columns = this._appGridColumns;
                    index = (this._selectedItemIndex - columns < 0) ? this._selectedItemIndex : this._selectedItemIndex - columns;
                // If categories in grid mode
                } else if ((this._activeContainer == this.categoryBox) && (this._appsViewMode == ApplicationsViewMode.GRID) && (this._categoriesViewMode == CategoriesViewMode.COMBINED)){
                	var columns = this._appGridColumns;
                    index = (this._selectedItemIndex - columns < 0) ? this._selectedItemIndex : this._selectedItemIndex - columns;
            	} else {
                    index = (this._selectedItemIndex - 1 < 0) ? this._selectedItemIndex : this._selectedItemIndex - 1;
                }
            }
        } else if (symbol && symbol == Clutter.KEY_Down) {
            	// If home or apps in grid mode
                if (((this._activeContainer == this.appsBox) ||(this._activeContainer == this.homeBox)) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
                	var columns = this._appGridColumns;
                    index = (this._selectedItemIndex + columns >= children.length) ? this._selectedItemIndex : this._selectedItemIndex + columns;
                // If categories in grid mode
                } else if ((this._activeContainer == this.categoryBox) && (this._appsViewMode == ApplicationsViewMode.GRID) && (this._categoriesViewMode == CategoriesViewMode.COMBINED)){
                	var columns = this._appGridColumns;
                    index = (this._selectedItemIndex + columns >= children.length) ? this._selectedItemIndex : this._selectedItemIndex + columns;
                } else {
                    index = (this._selectedItemIndex + 1 == children.length) ? children.length : this._selectedItemIndex + 1;
                }
        } else if (symbol && symbol == Clutter.KEY_Left) {
            if (this._selectedItemIndex != null && this._selectedItemIndex > 0) {
            	if (((this._activeContainer == this.appsBox) ||(this._activeContainer == this.homeBox)) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
                    var columns = this._appGridColumns;
                    var row = Math.floor(this._selectedItemIndex/columns);
                    var firstCol = (row * columns);
                    index = (this._selectedItemIndex - 1 < firstCol) ? firstCol : this._selectedItemIndex - 1;
            	} else if ((this._activeContainer == this.categoryBox) && (this._appsViewMode == ApplicationsViewMode.GRID) && (this._categoriesViewMode == CategoriesViewMode.COMBINED)){
            		var columns = this._appGridColumns;
                    var row = Math.floor(this._selectedItemIndex/columns);
                    var firstCol = (row * columns);
                    index = (this._selectedItemIndex - 1 < firstCol) ? firstCol : this._selectedItemIndex - 1;
                } else {
                    index = (this._selectedItemIndex - 1 < 0) ? this._selectedItemIndex : this._selectedItemIndex - 1;
                }
            }
        } else if (symbol && symbol == Clutter.KEY_Right) {
            	if (((this._activeContainer == this.appsBox) ||(this._activeContainer == this.homeBox)) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
                    var columns = this._appGridColumns;
                    var row = Math.floor(this._selectedItemIndex/columns);
                    var lastCol = (row * columns) + columns;
                    lastCol = (lastCol > children.length) ? children.length : lastCol;
                    index = (this._selectedItemIndex + 1 >= lastCol) ? index : this._selectedItemIndex + 1;
            	} else if ((this._activeContainer == this.categoryBox) && (this._appsViewMode == ApplicationsViewMode.GRID) && (this._categoriesViewMode == CategoriesViewMode.COMBINED)){
            		var columns = this._appGridColumns;
                    var row = Math.floor(this._selectedItemIndex/columns);
                    var lastCol = (row * columns) + columns;
                    lastCol = (lastCol > children.length) ? children.length : lastCol;
                    index = (this._selectedItemIndex + 1 >= lastCol) ? index : this._selectedItemIndex + 1;
                } else {
                    index = (this._selectedItemIndex + 1 == children.length) ? children.length : this._selectedItemIndex + 1;
                }
        } else if (symbol && symbol == Clutter.KEY_Return || symbol == Clutter.KP_Enter) {
            if (this._activeContainer == this.appsBox|| this._activeContainer == this.homeBox || this._activeContainer == this.placesBox || this._activeContainer == this.backContainBox || this._activeContainer == this.systemBox) {
            	if (this._activeContainer) {
                    this._clearActiveContainerSelections();
                }
                let item_actor = children[this._selectedItemIndex];
            	item_actor._delegate.activate();
                return true;
            } else if (this._activeContainer == this.systemBox || this._activeContainer == this.categoryBox) {
                if (index>=children.length) {
                } else {
                    let item_actor = children[this._selectedItemIndex];
                    item_actor._delegate.click();
                }
                return true;
            } else {
                return false;
            }
        } else {
            if ((code && code == 23) || isFromSearch) {
                index = 0;
            } else {
                return false;
            }
        }


        // Check if position reached its end
        if (index>=children.length) {
            index = children.length-1;
        }
        
        
        // Check if it's supposed to activate back or category button!
        // 0 = this.backButton, 1 = this.backToButton, 2 = this.goToButton
        if (this._activeContainer == this.backContainBox) {
        	if (this.currentCategory == 'default') {
        		// Select goToButton index
        		index = 2;
        	} else if (this.currentCategory == 'categories') {
        		// Select backToButton index
        		index = 1;
        	} else {
        		// Select backButton index
        		index = 0;
        	}
        }
        
        // All good .. now get item actor in container
        this._selectedItemIndex = index;
        let itemActor = children[this._selectedItemIndex];

        // Check if item actor is valid
        if (!itemActor || itemActor === this.searchEntry) {
            if (this._activeContainer == this.systemBox) {
                itemActor = this.extensionPreferences;
            } else {
                return false;
            }
        }

        // Clear out container and select item actor
        this._clearActiveContainerSelections(itemActor);
        
        if (this._activeContainer == this.placesBox || this._activeContainer == this.appsBox || this._activeContainer == this.homeBox || this._activeContainer == this.categoryBox) {
        	this._scrollToActiveContainerButton(itemActor);
        }
        return true;
    },
    
    
    // clear focus for keyboard input
    _clearTabFocusSelections: function(selectedBox, resetSearch) {
        this._selectedItemIndex = -1;
        this._clearActiveContainerSelections();
        if (!selectedBox)
            return;
        if (selectedBox!=this.searchBox && resetSearch)
            this.resetSearch();
    },
    
    _clearCategorySelections: function(container, selectedCategory) {
        let categoryActors = container.get_children();
        if (categoryActors) {
            for (let i = 0; i < categoryActors.length; i++) {
                let actor = categoryActors[i];
                if (selectedCategory && (actor == selectedCategory.actor)) {
                    actor.add_style_class_name('popup-sub-menu');
                    if (this._style1) actor.set_style(this._style1);
                } else {
                    actor.remove_style_class_name('popup-sub-menu');
                    actor.set_style('border-color: none');
                }
            }
        }
    },
	
    _clearTabFocusSelections: function(selectedBox, resetSearch) {
        this._selectedItemIndex = -1;
        this._clearActiveContainerSelections();

        if (!selectedBox)
            return;
        if (selectedBox!=this.searchBox && resetSearch)
            this.resetSearch();
    },
    

    _clearActiveContainerSelections: function(selectedContainerActor) {
        if (!this._activeContainer)
            return;

        // Return if activeContainer has no children
        // Such is the case with the thumbnailsBox
        if (!this._activeContainer.get_children)
            return;
        if (this._activeContainer == this.systemBox){
            this._activeContainer.get_children().forEach(function(actor) {
                if (selectedContainerActor) {
                    if (selectedContainerActor && (actor == selectedContainerActor)) {
                        actor.add_style_pseudo_class('hover');
                        if (actor._delegate && actor._delegate.select)
                            actor._delegate.select();
                    } else {
                        actor.remove_style_pseudo_class('hover');
                    }
                } else {
                    actor.remove_style_pseudo_class('hover');
                    if (actor._delegate && actor._delegate.unSelect)
                        actor._delegate.unSelect();
                }
            });
        } else {
	        this._activeContainer.get_children().forEach(function(actor) {
	            if (selectedContainerActor) {
	                if (selectedContainerActor && (actor == selectedContainerActor)) {
	                    actor.add_style_class_name('selected');
	                    if (actor._delegate && actor._delegate.select)
	                        actor._delegate.select();
	                } else {
	                    actor.remove_style_class_name('selected');
	                }
	            } else {
	                actor.remove_style_class_name('selected');
	                if (actor._delegate && actor._delegate.unSelect)
	                    actor._delegate.unSelect();
	            }
	        });
        }
    },

    _clearApplicationSelections: function(selectedApplication) {
        this.applicationsListBox.get_children().forEach(function(actor) {
            if (selectedApplication && (actor == selectedApplication)) {
                actor.add_style_class_name('selected');
            } else {
                actor.remove_style_class_name('selected');
            }
        });

        this.applicationsGridBox.get_children().forEach(function(actor) {
            if (selectedApplication && (actor == selectedApplication)) {
                actor.add_style_class_name('selected');
            } else {
                actor.remove_style_class_name('selected');
            }
        });
    },

    _clearApplicationsBox: function(selectedCategory, refresh){
        let listActors = this.applicationsListBox.get_children();
        if (listActors) {
            for (let i=0; i<listActors.length; i++) {
                let actor = listActors[i];
                this.applicationsListBox.remove_actor(actor);
            }
        }

        let gridActors = this.applicationsGridBox.get_children();
        if (gridActors) {
            for (let i=0; i<gridActors.length; i++) {
                let actor = gridActors[i];
                this.applicationsGridBox.remove_actor(actor);
            }
        }

        // Don't want to clear selected category if just refreshing because of view mode change
        if (refresh)
            return;

        let categoryActors = this.categoryBox.get_children();
        if (categoryActors) {
            for (let i = 0; i < categoryActors.length; i++) {
                let actor = categoryActors[i];
                if (selectedCategory && (actor == selectedCategory.actor)) {
                    actor.add_style_class_name('popup-sub-menu');
                    if (this._style1) actor.set_style(this._style1);
                } else {
                    actor.remove_style_class_name('popup-sub-menu');
                    actor.set_style('border-color: none');
                }
            }
        }
    },
    
    /* Keyboard Input Finally ENDS HERE */
	
	
	
	
	
	
	
	
	
	
	

	// TOGGLE MENU FUNCTION
	_toggleMenu: function() {
		this._activeContainer = this.searchBox;
		//let animationTime = 1000;
		//TODO(Disable when right click menu open)
		if (this.toggleMenuFlag) {
			this.menu.toggle();
			//Mainloop.timeout_add(animationTime, Lang.bind(this, function() {
				//if (this.toggleMenuFlag) {
					this.mainBox.show();
					this.altBox.hide();
				//}
				//}));
		} else {
			// Close right click menu somehow
			// and then Close menu
		}
	},

	// Panel button widget get function
	_getWidget: function() {
		return this._menuButtonWidget;
	},


	// Load Default Apps Panel Items
	_loadHome: function() {
		if (this.HomeViewSettings != HomeView.CATEGORIES) {
			if (this.homeBox)
				this.homeBox.destroy_all_children();
			this._displayButtons(this._listApplications(this.HomeViewSettings), this.homeBox);
		}

	},




	// Load Frequent Apps
	_loadFrequent: function() {
		this._frequentApps = [];
		let mostUsed = Shell.AppUsage.get_default().get_most_used('');
		for (let i=0; i<mostUsed.length; i++) {
			if (mostUsed[i].get_app_info().should_show())
				this._frequentApps.push(mostUsed[i]);
		}
	},

	// Load Favorite Apps
	_loadFavorites: function() {
		this._favorites = [];
		let launchers = global.settings.get_strv('favorite-apps');
		//global.log("menyy: " + launchers);
		for (let i = 0; i < launchers.length; ++i) {
			//global.log("menyy: launcher [" + i + "] :" + launchers[i]);
			let app = Shell.AppSystem.get_default().lookup_app(launchers[i]);
			if (app)
				this._favorites.push(app);
		}
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

	// Load data for all menu categories
	_loadCategories: function() {
		let column = 0;
		let rownum = 0;
		let gridLayout = this.appsBox.layout_manager;
		this.applicationsByCategory = {};
		let tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
		tree.load_sync();
		let root = tree.get_root_directory();
		let iter = root.iter();
		let nextType;
		
		/*
		 * Favorite Apps Category
		 */        
		let favAppCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			favAppCategory = new CategoryButton('favorites', _('Favorite Apps'), 'applications-other', this);
			favAppCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(favAppCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			favAppCategory = new CategoryButton('favorites', _('Favorite Apps'), 'applications-other', this);
		}
		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			this.appsBox.add_actor(favAppCategory.actor);
		} else {
			this.categoryBox.add_actor(favAppCategory.actor);
		}
		
		
		/*
		 * All Apps Category
		 */   
		let allAppsCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			allAppsCategory = new CategoryButton('all', _('All Applications'), 'applications-other', this);
			allAppsCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(allAppsCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			allAppsCategory = new CategoryButton('all', _('All Applications'), 'applications-other', this);
		}
		
		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			this.appsBox.add_actor(allAppsCategory.actor);
		} else {
			this.categoryBox.add_actor(allAppsCategory.actor);
		}

		// Frequent Category
		let freqAppCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			freqAppCategory = new CategoryButton('frequent', _('Frequent Apps'), 'applications-other', this);
			freqAppCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(freqAppCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			freqAppCategory = new CategoryButton('frequent', _('Frequent Apps'), 'applications-other', this);
		}
		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			this.appsBox.add_actor(freqAppCategory.actor);
		} else {
			this.categoryBox.add_actor(freqAppCategory.actor);
		}
		
		// Recent Files Category
		let recentFilesCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			recentFilesCategory = new CategoryButton('recent', _('Recent Files'), 'applications-other', this);
			recentFilesCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(recentFilesCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			recentFilesCategory = new CategoryButton('recent', _('Recent Files'), 'applications-other', this);
		}
		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			this.appsBox.add_actor(recentFilesCategory.actor);
		} else {
			this.categoryBox.add_actor(recentFilesCategory.actor);
		}

		// Web Bookmarks Category
		let webBookmarksCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			webBookmarksCategory = new CategoryButton('webBookmarks', _('Web Bookmarks'), 'applications-other', this);
			webBookmarksCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(webBookmarksCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			webBookmarksCategory = new CategoryButton('webBookmarks', _('Web Bookmarks'), 'applications-other', this);
		}

		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			this.appsBox.add_actor(webBookmarksCategory.actor);
		} else {
			this.categoryBox.add_actor(webBookmarksCategory.actor);
		}
		/*
		 * Real Categories
		 */
		while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
			if (nextType == GMenu.TreeItemType.DIRECTORY) {
				let dir = iter.get_directory();
				let categoryId = dir.get_menu_id();
				this.applicationsByCategory[categoryId] = [];
				this._loadCategory(categoryId, dir);
				if (this.applicationsByCategory[dir.get_menu_id()].length>0){
					let appCategory;
					if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
						appCategory = new CategoryButton(dir, _, _, this);
						appCategory.buttonbox.width = this._appGridButtonWidth;
						gridLayout.pack(appCategory.actor, column, rownum);
						column ++;
						if (column > this._appGridColumns-1) {
							column = 0;
							rownum ++;
						}
					} else {
						appCategory = new CategoryButton(dir, _, _, this);
					}
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
			if (this.HomeViewSettings != HomeView.CATEGORIES) this.backToButton.actor.show();
			this.goToButton.actor.hide();
		}
		
		this._allAppsList = [];		// reset the list
		for (var directory in this.applicationsByCategory) {
			this._allAppsList = this._allAppsList.concat(this.applicationsByCategory[directory]);
		}
		// Remove Duplicates
		this._allAppsList = this._allAppsList.filter(function(elem, index, self) {
		    return index == self.indexOf(elem);
		})
	},

	// Load right click menu
	_loadRightClick: function() {
		if (placeDisplay) {
			this.placesManager = new placeDisplay.PlacesManager(true);
		} else {
			this.placesManager = null;
		};

		// Load Places Panel
		let shortcuts = new Array();
		let shortcutType;
		shortcuts = this._listRightClick();
		shortcutType = AppType.PLACE;
		for (let i = 0; i < shortcuts.length; ++i) {
			let app = shortcuts[i];
			// TODO( ADD FUNCTIONALITY TO THE BUTTON INSTEAD OR USE APPLICATION BUTTON!)
			let shortcutButton = new ShortcutButton(app, shortcutType);
			this.rightClickBox.add_actor(shortcutButton.actor);
			shortcutButton.actor.connect('enter-event', Lang.bind(this, function() {
				shortcutButton.actor.add_style_class_name('selected');
			}));
			shortcutButton.actor.connect('leave-event', Lang.bind(this, function() {
				shortcutButton.actor.remove_style_class_name('selected');
			}));
			shortcutButton.actor.connect('button-press-event', Lang.bind(this, function() {
				shortcutButton.actor.add_style_pseudo_class('pressed');
			}));
			shortcutButton.actor.connect('button-release-event', Lang.bind(this, function() {
				shortcutButton.actor.remove_style_pseudo_class('pressed');
				shortcutButton.actor.remove_style_class_name('selected');
				if (true){
					if (app.uri) {
						shortcutButton.app.app.launch_uris([app.uri], null);
					} else {
						shortcutButton.app.launch();
					}
				} else {
					shortcutButton.app.open_new_window(-1);
				}
				this.menu.close();
			}));
		}
	},

	// Load menu place shortcuts
	_loadPlaces: function() {
		if (placeDisplay) {
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
		if (true){
			let places = this._listPlaces();
			let bookmarks = this._listBookmarks();
			let devices = this._listDevices();
			let allPlaces = places.concat(bookmarks.concat(devices));
			shortcuts = allPlaces;
		} else {
			shortcuts = this._favorites;
		}
		for (let i = 0; i < shortcuts.length; ++i) {
			let app = shortcuts[i];
			let shortcutButton = new AppButton(app, this, 'places');
			this.placesBox.add_actor(shortcutButton.actor);
		}
	},

	// LOADS PLACES
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

	// LOADS RIGHT CLICK OPTIONS
	_listRightClick: function(pattern) {
		if (!this.placesManager)
			return null;
		let places = this.placesManager.getRightClickPlaces();
		let res = [];
		for (let id = 0; id < places.length; id++) {
			if (!pattern || places[id].name.toLowerCase().indexOf(pattern)!=-1)
				res.push(places[id]);
		}
		return res;
	},

	// LOADS BOOKMARKS
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
	
	// LOADS TERMINAL COMMANDS
	_listTerminalCommands: function(pattern, amount){
		let debugMe = false;
		let res = [];
		if (commandLineDisplay) {															// if commandlinedisplay imported
			if (!this.commandLineManager) 													// if the manager is not yet present
				this.commandLineManager = new commandLineDisplay.CommandLineManager(true);	// create manager
		} else {																			// if no commandlinedisplay imported
			this.commandLineManager = null;													// then just ignore this part completely
		};
		if (amount > 0) {
			res = this.commandLineManager.getCommands(pattern, amount);
		}
		if (debugMe) global.log("menyy -> _listTerminalCommands '" + pattern + "': " + res);
		return res;
	},

	
	// LOADS WEB BOOKMARKS
    _listWebBookmarks: function(pattern) {
    	//global.log("menyy -> listwebbookmarks -> pattern: " + pattern);
        if (!this._searchWebErrorsShown) {
            if (!Firefox.Gda) {
                //let notifyTitle = _("Gno-Menu: Search Firefox bookmarks disabled");
                //let notifyMessage = _("If you want to search Firefox bookmarks, you must install the required pacakages: gir1.2-gda-5.0 [Ubuntu] or libgda-sqlite [Fedora]");
                //this.selectedAppTitle.set_text(notifyTitle);
                //this.selectedAppDescription.set_text(notifyMessage);
            }
            if (!Midori.Gda) {
                //let notifyTitle = _("Gno-Menu: Search Midori bookmarks disabled");
                //let notifyMessage = _("If you want to search Midori bookmarks, you must install the required pacakages: gir1.2-gda-5.0 [Ubuntu] or libgda-sqlite [Fedora]");
                //this.selectedAppTitle.set_text(notifyTitle);
                //this.selectedAppDescription.set_text(notifyMessage);
            }
        }
        this._searchWebErrorsShown = true;

        let res = [];
        let searchResults = [];
        let bookmarks = [];

        bookmarks = bookmarks.concat(Chromium.bookmarks);
        // bookmarks = bookmarks.concat(Epiphany.bookmarks);
        bookmarks = bookmarks.concat(Firefox.bookmarks);
        bookmarks = bookmarks.concat(GoogleChrome.bookmarks);
        bookmarks = bookmarks.concat(Midori.bookmarks);
        bookmarks = bookmarks.concat(Opera.bookmarks);
        
        //global.log("menyy -> listwebbookmarks -> bookmarks: " + bookmarks);

        for (let id = 0; id < bookmarks.length; id++) {
            if ((!pattern) || (bookmarks[id].name.toLowerCase().indexOf(pattern)!=-1)) {
                res.push({
                    app:   bookmarks[id].appInfo,
                    name:   bookmarks[id].name,
                    icon:   bookmarks[id].appInfo.get_icon(),
                    mime:   null,
                    uri:    bookmarks[id].uri,
                    appType: bookmarks[id].appType
                });
            }
        }

        res.sort(this._searchWebBookmarks.bookmarksSort);
        return res;
    },
	 

	// LOADS CONNECTED DEVICES
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

	// LOADS RECENT FILES
	_listRecent: function(pattern) {
		let recentFiles = this.recentManager.get_items();
		let res = new Array();
		let type;
		
		//TODO(CHECK IF APPTYPE FILE OR FOLDER)
		for (let id = 0; id < recentFiles.length; id++) {
			let recentInfo = recentFiles[id];
			//global.log("menyy file uri: " + recentInfo.get_uri());
			//global.log("menyy file typ: " + recentInfo.get_mime_type());
			if (recentInfo.get_mime_type() == 'inode/directory') {
				type = AppType.FOLDER;
			} else {
				type = AppType.FILE;
			}
			if (recentInfo.exists()) {
				if (!pattern || recentInfo.get_display_name().toLowerCase().indexOf(pattern)!=-1) {
					res.push({
						name:   recentInfo.get_display_name(),
						icon:   recentInfo.get_gicon(),
						mime:   recentInfo.get_mime_type(),
						uri:    recentInfo.get_uri(),
						appType: type
					});
				}
			}
		}
		return res;
	},

	// Display application menu items
	_displayButtons: function(apps, location) {
		let page = 0;
		let column = 0;
		let rownum = 0;
		
		for (var i in apps) {
			const app = apps[i];
			if (this._appsViewMode == ApplicationsViewMode.LIST) { // ListView
				let appButton = new AppButton(app, this, 'apps');
				location.add_actor(appButton.actor);
			} else {
				let appButton = new AppButton(app, this, 'apps');
				appButton.buttonbox.width = this._appGridButtonWidth;
				let gridLayout = location.layout_manager;
				gridLayout.pack(appButton.actor, column, rownum);
				column ++;
				if (column > this._appGridColumns-1) {
					column = 0;
					rownum ++;
				}
			}
		}
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




	//TODO(CLEAN UP SELECTCATEGORY CODE)
	_selectCategory: function(button) {
		this._clearAppsBox();
		this.resetSearch();
		if (button){
			let category = button._dir || button;
			this.currentCategory = category;
			if (category == 'default') {
				if (this.HomeViewSettings != HomeView.CATEGORIES) {
					this.homeScrollBox.show();
					this.appsScrollBox.hide();
				} else {
					// Recursion, selects categories instead
					this._selectCategory('categories');
				}
				if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
					if (this.HomeViewSettings != HomeView.CATEGORIES) this.goToButton.actor.show();
					this.backButton.actor.hide();
					this.backToButton.actor.hide();
				}
			} else if (category == 'categories'){
				this.homeScrollBox.hide();
				this.appsScrollBox.show();
				// this._loadCategories();
				if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
					this._loadCategories();
					if (this.HomeViewSettings != HomeView.CATEGORIES) this.backToButton.actor.show();
					this.backButton.actor.hide();
					this.goToButton.actor.hide();
				}
			} else if (typeof category == 'string') { // For custom categories such as "all categories", "recent", "favorites", "webbookmarks" and "shortcuts"
				this.homeScrollBox.hide();
				this.appsScrollBox.show();
				if (category == 'recent') {
					this._displayButtons(this._listApplications(category), this.appsBox);
				} else if (category == 'webBookmarks'){
					this._displayButtons(this._listApplications(category), this.appsBox);
				} else {
					this._displayButtons(this._listApplications(category), this.appsBox);
				}
				this.homeScrollBox.hide();
				this.appsScrollBox.show();
				if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
					this.backButton.actor.show();
					this.backToButton.actor.hide();
					this.goToButton.actor.hide();
				}
			} else {
				this.homeScrollBox.hide();
				this.appsScrollBox.show();
				this._displayButtons(this._listApplications(category.get_menu_id()), this.appsBox);
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


	// TODO(CLEAN UP APPLICATION LIST CODE, IF POSSIBLE)
	// Get a list of applications for the specified category or search query
	_listApplications: function(category_menu_id, pattern) {
		let applist;


		// Loading categories for home screen
		if (typeof category_menu_id == 'number'){
			if (category_menu_id == 0) {				// 0 is Categories
				this._loadCategories();
			} else if (category_menu_id == 1) {			// 1 is frequent
				applist = this._frequentApps;
			} else if (category_menu_id == 2) {			// 2 is favorites
				applist = this._favorites;
			} else if (category_menu_id == 3) {			// 3 is all
				applist = this._allAppsList;
			} else if (category_menu_id == 4) {			// 4 is recent
				applist = this._listRecent();
			} else if (category_menu_id == 5) {			// 5 is Shortcuts
				// Skip for now
			} else {
				applist = this._allAppsList;
			}
			// Loading categories for Apps screen
		} else {
			// Get proper applications list
			if (category_menu_id == 'all') {
				applist = this._allAppsList;
			} else if (category_menu_id == 'frequent') {
				applist = this._frequentApps;
			} else if (category_menu_id == 'favorites') {
				applist = this._favorites;
			} else if (category_menu_id == 'shortcuts') {
				// do something once done
			} else if (category_menu_id == 'recent') {
		        applist = this._listRecent();
			} else if (category_menu_id == 'webBookmarks') {
				applist = this._listWebBookmarks();
			} else  if (category_menu_id) {
				applist = this.applicationsByCategory[category_menu_id];
			} else {
				applist = this._allAppsList;
			}        
		}
		let res; // Results array


		// Searching
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
			//TODO(ADD SORTING APPS AS AN OPTION)
			/*
			applist.sort(function(a,b) {
				return a.get_name().toLowerCase() > b.get_name().toLowerCase();
			});
			 */
			res = applist;
		}
		return res;
	},
	
	_removeSearchTimeout: function(){
		//global.log("menyy searchTimeoutId: " + this._searchTimeoutId);
	     if (this._searchTimeoutId > 0) {
	         Mainloop.source_remove(this._searchTimeoutId);
	         this._searchTimeoutId = 0;
	     }		
	},
	
	_setSearchTimeout: function(se, prop){
		this._removeSearchTimeout();
		//this._searchTimeoutId = Mainloop.timeout_add(this._searchWaitTime,
		this._searchTimeoutId = Mainloop.timeout_add(this._settings.get_int('search-timeout-time'),
				Lang.bind(this, function() {
					// could be null due ot the timeout and last moment change in text
					// this prevents the whole shell from crashing due to the weird behaviour
					if (this.searchEntry.get_text() != null) {
						let searchString = this.searchEntry.get_text();
						//If text is "force shell restart", then restart the shell
						if (searchString == 'force shell restart') {
							global.reexec_self();
						} else if (searchString == 'force open activities'){
							Main.overview.toggle();
						}
	
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
						} else {
							if (this._searchIconClickedId > 0)
								this.searchEntry.disconnect(this._searchIconClickedId);
							this._searchIconClickedId = 0;
							this.searchEntry.set_secondary_icon(null);
							if (searchString == "" && this._previousSearchPattern != "") {
								if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
									this._selectCategory('categories');
								} else {
									this._openDefaultCategory();
								}
							}
							this._previousSearchPattern = "";
						}
					}
					return false;
				}
			)
		);
		GLib.Source.set_name_by_id(this._searchTimeoutId, '[gnome-shell] this._doSearch');
		return false;
	},
	
	_searchWithoutTimeOut: function(se, prop){
		if (this.searchEntry.get_text() != null) {
			let searchString = this.searchEntry.get_text();
			//If text is "force shell restart", then restart the shell
			if (searchString == 'force shell restart') {
				global.reexec_self();
			} else if (searchString == 'force open activities'){
				Main.overview.toggle();
			}
		
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
			} else {
				if (this._searchIconClickedId > 0)
					this.searchEntry.disconnect(this._searchIconClickedId);
				this._searchIconClickedId = 0;
				this.searchEntry.set_secondary_icon(null);
				if (searchString == "" && this._previousSearchPattern != "") {
					if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
						this._selectCategory('categories');
					} else {
						this._openDefaultCategory();
					}
				}
				this._previousSearchPattern = "";
			}
		}
		return false;
	},
	
	// Start search timeout
	_onSearchTextChanged: function (se, prop) {
		if (this._settings.get_boolean('search-timeout') == true) {
			this._setSearchTimeout(se, prop);
		} else {
			this._searchWithoutTimeOut(se, prop);
		}
	},

	// Carry out a search based on the search text entry value
	_doSearch: function(){
		this._searchTimeoutId = 0;
		let pattern = this.searchEntryText.get_text().replace(/^\s+/g, '').replace(/\s+$/g, '').toLowerCase();
		if (pattern==this._previousSearchPattern) return;
		this._previousSearchPattern = pattern;
		if (pattern.length == 0) {
			return;
		}
		
		let appResults = this._listApplications(null, pattern);
		appResults = appResults.slice(0, this._settings.get_int('search-apps'));
		
        // search terminal commands - needs to be muteable
        let terminalResults = this._listTerminalCommands(pattern, (this._settings.get_int('search-terminal')).toString());  
        // Remove items, that already exist in the all apps menu
        if (appResults.length > 0) {
	        for(var i = appResults.length - 1; i >= 0; i--) {
	        	if (terminalResults.length > 0) {
		            for(var j = 0; j < terminalResults.length; j++) {
		                if((appResults[i].get_app_info().get_executable())  == (terminalResults[j].get_executable())) {
		                    terminalResults.splice(i, 1);
		                }
		            }
	        	}
	        }
        }
		let placesResults = new Array();
		// Search Places
        let places = this._listPlaces(pattern);
        places = places.slice(0, this._settings.get_int('search-places'));
        for (var i in places) placesResults.push(places[i]); // until fixed, don't show

        //Search Bookmarks
        //let bookmarks = this._listBookmarks(pattern);
        //for (var i in bookmarks) placesResults.push(bookmarks[i]);
        
        // Search Web Bookmarks
        let webBookmarks = this._listWebBookmarks(pattern);
        webBookmarks = webBookmarks.slice(0, this._settings.get_int('search-webmarks'));
        for (var i in webBookmarks) placesResults.push(webBookmarks[i]);
        
        // Search Devices
        //let devices = this._listDevices(pattern);
        //for (var i in devices) placesResults.push(devices[i]);
        
        // Search recent
        let recentResults = this._listRecent(pattern);
        recentResults = recentResults.slice(0, this._settings.get_int('search-recent'));

		this._clearAppsBox();
		
		for (var i in terminalResults) appResults.push(terminalResults[i]);
		for (var i in placesResults) appResults.push(placesResults[i]);
		for (var i in recentResults) appResults.push(recentResults[i]);
		this._displayButtons(appResults, this.appsBox);
		
		this.homeScrollBox.hide();
		this.appsScrollBox.show();
		if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
			this.backButton.actor.show();
			this.backToButton.actor.hide();
			this.goToButton.actor.hide();
		}
		
		this._activeContainer = this.appsBox;
		this.selectActiveContainerItem(null, null, true);		
	},
	
	/*
	_doAsyncSearch: function() {
		GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, this._doSearch(), null);
	},
	*/

	// Reset the search
	resetSearch: function(){
		this.searchEntry.set_text("");
		this.searchActive = false;
		global.stage.set_key_focus(this.searchEntry);
	},

	// Handle captured event
	_onCapturedEvent: function(actor, event) {
		if (event.type() == Clutter.EventType.BUTTON_PRESS) {
			if (!Main.overview.shouldToggleByCornerOrButton())
				return true;
		}
		return false;
	},

	// TODO(GET RID OF THIS FUNCTION AND ACTIVATE IT DIRECTLY)
	_openDefaultCategory: function(){
		this._selectCategory('default');
	},

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
			this.altBox.hide();
		}
		this._activeContainer = null;
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

	// Layout mainbox get function
	// TODO(CHECK IF NECESSARY!)
	_getLayout: function() {
		return this.mainBox();
	},

	// Adds application to apps box
	_setApplications: function(item) {
		this.appsBox.add(item);
	},

	// Display the menu
	_display: function() {
		this.mainBox.hide();
		if (this._settings.get_enum('visible-menus') != visibleMenus.SYSTEM_ONLY) {
			this._appsButtons = new Array();
			this._clearCategoryBox();
			this._loadCategories();
			this._previousSearchPattern = "";
			if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
				this.backButton.actor.hide();
				this.backToButton.actor.show();
				this.goToButton.actor.hide();
			}
		}
	},






	_destroyLayout: function() {
		///////////////////////////////////////////////////////
		//Destroy starting from deepest and ending at section//
		//Current Layout looks kind of like this!			 //
		//section--------------------------------------------//
		//--|>mainBox----------------------------------------//
		//--|---|>topBox-------------------------------------//
		//--|---|---|>leftbox--------------------------------//
		//--|---|---|---|>appsScrollBoxContainer-------------//
		//--|---|---|---|---|>appsScrollBox------------------//
		//--|---|---|---|---|---|>appsBoxWrapper-------------//
		//--|---|---|---|---|-------|>appsBox----------------//
		//--|---|---|---|---|>homeScrollBox------------------//
		//--|---|---|---|---|---|>homeBoxWrapper-------------//
		//--|---|---|---|---|-------|>homeBox----------------//
		//--|---|---|---|>backButton-------------------------//
		//--|---|---|---|>backToButton-----------------------//
		//--|---|---|---|>goToButton-------------------------//
		//--|---|---|>rightBox-------------------------------//
		//--|---|-------|>placesScrollBox--------------------//
		//--|---|-----------|>placesBox----------------------//
		//--|---|>centerBox----------------------------------//
		//--|---|>bottomBox----------------------------------//
		//--|-------|>searchBox------------------------------//
		//--|-------|---|>searchEntry------------------------//
		//--|-------|>systemBox------------------------------//
		//--|>altBox-----------------------------------------//
		//------|>rightClickBox------------------------------//
		///////////////////////////////////////////////////////
		global.log("menyy: Starting Layout Destruction");

		if (this.homeBox) this.homeBox.destroy_all_children();
		if (this.appsBox) this.appsBox.destroy_all_children();
		global.log("menyy: homeBox and appsBox Destroyed");


		if (this.homeBoxWrapper) this.homeBoxWrapper.destroy_all_children();
		if (this.appsBoxWrapper) this.appsBoxWrapper.destroy_all_children();
		global.log("menyy: homeBoxWrapper and appsBoxWrapper Destroyed");

		if (this.homeScrollBox) this.homeScrollBox.destroy_all_children();
		if (this.appsScrollBox) this.appsScrollBox.destroy_all_children();
		if (this.placesBox) this.placesBox.destroy_all_children();
		global.log("menyy: homeScrollBox appsScrollBox and placesBox Destroyed");

		if (this.appsScrollBoxContainer) this.appsScrollBoxContainer.destroy_all_children();
		if (this.placesScrollBox) this.placesScrollBox.destroy_all_children();
		if (this.searchEntry) this.searchEntry.destroy_all_children();
		global.log("menyy: appsScrollBoxContainer, placesScrollBox, and searchEntry Destroyed");

		if (this.leftBox) this.leftBox.destroy_all_children();
		if (this.rightBox) this.rightBox.destroy_all_children();
		if (this.searchBox) this.searchBox.destroy_all_children();
		global.log("menyy: leftBox, rightBox, and searchBox Destroyed");

		if (this.topBox) this.topBox.destroy_all_children();
		if (this.centerBox) this.centerBox.destroy_all_children();
		if (this.bottomBox) this.bottomBox.destroy_all_children();
		if (this.rightClickBox) this.rightClickBox.destroy_all_children();
		global.log("menyy: topBox, centerBox, bottomBox and rightClickBox Destroyed");

		if (this.mainBox) this.mainBox.destroy_all_children();
		if (this.altBox) this.altBox.destroy_all_children();
		global.log("menyy: mainBox and altBox Destroyed");

		//if (section) section.destroy_all_children();
		//global.log("menyy: section Destroyed");


		this.homeBox = null;
		this.appsBox = null;

		this.homeBoxWrapper = null;
		this.appsBoxWrapper = null;

		this.homeScrollBox = null;
		this.appsScrollBox = null;
		this.placesBox = null;

		this.appsScrollBoxContainer = null;
		this.placesScrollBox = null;
		this.backButton = null;
		this.backToButton = null;
		this.goToButton = null;
		this.searchEntry = null;

		this.leftBox = null;
		this.rightBox = null;
		this.searchBox = null;
		this.systemBox = null;

		this.topBox = null;
		this.centerBox = null;
		this.bottomBox = null;
		this.rightClickBox = null;

		this.mainBox = null;
		this.altBox = null;
		global.log("menyy: all Boxes are now null");

		section = null;
		global.log("menyy: section is now null");
	},



	// Destroy the menu button
	// TODO(!!!!!!!!!! destroy all things!)
	_onDestroy: function() {
		global.log("menyy: Starting Destruction");
		
		this._searchWebBookmarks.destroy();
		global.log("menyy: searchWebBookmarks Destroyed");

		this._destroyLayout();
		global.log("menyy: layout Destroyed");

		// MAKE ALL VARIABLES NULL (CHECK IF NECESSARY LATER)
		this._settings = null;
		global.log("menyy: settings destroyed");

		this.reloadFlag = null;
		this.currentCategory = null;
		global.log("menyy: reloadFlag and currentCategory Destroyed");


		if (this.placesManager) {
			//this.placesManager.destroy_all_children();
			this.placesManager.destroy();
		}
		this.placesManager = null;
		global.log("menyy: placesManager Destroyed");


		//if (this._allAppsList) this._allAppsList.destroy_all_children();
		this._allAppsList = null;
		global.log("menyy: _allAppsList Destroyed");

		//if (this._frequentApps) this._frequentApps.destroy_all_children();
		this._frequentApps = null;
		global.log("menyy: _frequentApps Destroyed");

		//if (this._favorites) this._favorites.destroy_all_children();
		this._favorites = null;
		global.log("menyy: _favorites Destroyed");

		//if (this._places) this._places.destroy_all_children();
		this._places = null;
		global.log("menyy: places Destroyed");

		//if (this._recent) this._recent.destroy_all_children();
		this._recent = null;
		global.log("menyy: _recent Destroyed");

		//if (this._menyy_favorites) this._menyy_favorites.destroy_all_children();
		this._menyy_favorites = null;
		global.log("menyy: _menyy_favorites Destroyed");

		this._appGridColumns = null;
		global.log("menyy: _appGridColumns Destroyed");

		this._appsViewMode = null;
		global.log("menyy: _appsViewMode Destroyed");

		this._categoriesViewMode = null;
		global.log("menyy: _categoriesViewMode Destroyed");

		this._appGridButtonWidth = null;
		global.log("menyy: _appsGridButtonWidth Destroyed");

		if (this._menuButtonWidget) {
			this._menuButtonWidget.destroy_all_children();
			this._menuButtonWidget.destroy();
		}
		this._menuButtonWidget = null;
		global.log("menyy: _menuButtonWidget Destroyed");

		this._searchActiveIcon = null;
		this._searchInactiveIcon = null;
		global.log("menyy: _searchIcons Destroyed");

		this._session = null;
		global.log("menyy: _session Destroyed");

		if (this.applicationsByCategory) {
			for (let directory in this.applicationsByCategory)
				if (this.applicationsByCategory[directory]) {
					this.applicationsByCategory[directory] = null;
					global.log("menyy: applicationsByCategory[ " + directory  + "] Destroyed");
				}
			//this.applicationsByCategory.destroy_all_children();
		}
		this.applicationsByCategory = null;
		global.log("menyy: applicationsByCategory Destroyed");


		this._searchIconClickedId = null;
		this.hoverDelay = null;
		this.searchActive = null;
		this.searchEntryText = null;
		this.selectionMethod = null;
		global.log("menyy: Search Settings Destroyed");

		if (this.actor) {
			this.actor.destroy_all_children();
			this.actor = null;
		}
		global.log("menyy: this actor Destroyed");



		// WHAT ARE SHOWING ID, HIDING ID, INSTALLEDCHANGEDID AND PANELBOXCHANGEDID?
		/*
		Main.overview.disconnect(this._showingId);
		Main.overview.disconnect(this._hidingId);
		Main.layoutManager.disconnect(this._panelBoxChangedId);
		appSys.disconnect(this._installedChangedId);
		global.log("menyy: Stuff Disconnected / Destroyed");
		 */
		global.log("menyy: Good Bye!");
	},
});
