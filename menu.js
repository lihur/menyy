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

const Meta = imports.gi.Meta;										// DesktopTarget
const DND = imports.ui.dnd;											// DesktopTarget



//My extension files
const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const systemButtons = Menyy.imports.systemButtons;
const menuButtons = Menyy.imports.menuButtons;
const placeDisplay = Menyy.imports.placeDisplay;
const convenience = Menyy.imports.convenience;
const MenuButtonWidget = Menyy.imports.menuWidget.MenuButtonWidget;

//SystemButtons
const PowerButton = systemButtons.PowerButton;
const ShellButton = systemButtons.ShellButton;
const LogoutButton = systemButtons.LogoutButton;
const SuspendButton = systemButtons.SuspendButton;
const LockButton = systemButtons.LockButton;

//MenuButtons
const CategoryListButton = menuButtons.CategoryListButton;
const AppListButton = menuButtons.AppListButton;
//Signals.addSignalMethods(AppListButton.prototype);
const CategoryGridButton = menuButtons.CategoryGridButton;
const AppGridButton = menuButtons.AppGridButton;
Signals.addSignalMethods(AppGridButton.prototype);
const ShortcutButton = menuButtons.ShortcutButton;
const UserMenuItem = menuButtons.UserMenuItem;
const BackMenuItem = menuButtons.BackMenuItem;

//Old ones
//const BaseMenuItem = menuButtons.BaseMenuItem;




//LOOK settings
var LocationHorizontal = 0; 
var LocationVertical = 0;
var SearchLocation = 0;
var CategoryLocation = 0;
var defaultCategory = 1;
var searchFixed = false;
//DELETEME!
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


//TODO(Add homeview settings and listener)
const HomeViewSettings = HomeView.FREQUENT;
//const HomeViewSettings = HomeView.CATEGORIES;


//TODO(MOVE ELSEWHERE!)
//Drag to desktop functionality
//Drag and drop from "Applications menu" (aps-menu@gnome-shell-extensions.gcampax.github.com)
const DesktopTarget = new Lang.Class({
	Name: 'DesktopTarget',

	_init: function() {
		this._desktop = null;
		this._desktopDestroyedId = 0;

		this._windowAddedId =
			global.window_group.connect('actor-added',
					Lang.bind(this, this._onWindowAdded));

		global.get_window_actors().forEach(a => {
			this._onWindowAdded(a.get_parent(), a);
		});
	},

	get hasDesktop() {
		return this._desktop != null;
	},

	_onWindowAdded: function(group, actor) {
		if (!(actor instanceof Meta.WindowActor))
			return;

		if (actor.meta_window.get_window_type() == Meta.WindowType.DESKTOP)
			this._setDesktop(actor);
	},

	_setDesktop: function(desktop) {
		if (this._desktop) {
			this._desktop.disconnect(this._desktopDestroyedId);
			this._desktopDestroyedId = 0;

			delete this._desktop._delegate;
		}

		this._desktop = desktop;
		this.emit('desktop-changed');

		if (this._desktop) {
			this._desktopDestroyedId = this._desktop.connect('destroy', () => {
				this._setDesktop(null);
			});
			this._desktop._delegate = this;
		}
	},

	_getSourceAppInfo: function(source) {
		//global.log("menyy: source: " + source);
		if (!(source instanceof AppListButton))
			return null;
		//if (!(source instanceof ApplicationMenuItem))
		//	return null;
		return source._app.app_info;
	},

	_touchFile: function(file) {
		let queryFlags = Gio.FileQueryInfoFlags.NONE;
		let ioPriority = GLib.PRIORITY_DEFAULT;

		let info = new Gio.FileInfo();
		info.set_attribute_uint64(Gio.FILE_ATTRIBUTE_TIME_ACCESS,
				GLib.get_real_time());
		file.set_attributes_async (info, queryFlags, ioPriority, null,
				(o, res) => {
					try {
						o.set_attributes_finish(res);
					} catch(e) {
						log('Failed to update access time: ' + e.message);
					}
				});
	},

	_markTrusted: function(file) {
		let modeAttr = Gio.FILE_ATTRIBUTE_UNIX_MODE;
		let trustedAttr = 'metadata::trusted';
		let queryFlags = Gio.FileQueryInfoFlags.NONE;
		let ioPriority = GLib.PRIORITY_DEFAULT;

		file.query_info_async(modeAttr, queryFlags, ioPriority, null,
				(o, res) => {
					try {
						let info = o.query_info_finish(res);
						let mode = info.get_attribute_uint32(modeAttr) | 0100;

						info.set_attribute_uint32(modeAttr, mode);
						info.set_attribute_string(trustedAttr, 'yes');
						file.set_attributes_async (info, queryFlags, ioPriority, null,
								(o, res) => {
									o.set_attributes_finish(res);

									// Hack: force nautilus to reload file info
									this._touchFile(file);
								});
					} catch(e) {
						log('Failed to mark file as trusted: ' + e.message);
					}
				});
	},

	destroy: function() {
		if (this._windowAddedId)
			global.window_group.disconnect(this._windowAddedId);
		this._windowAddedId = 0;

		this._setDesktop(null);
	},

	handleDragOver: function(source, actor, x, y, time) {
		let appInfo = this._getSourceAppInfo(source);
		if (!appInfo)
			return DND.DragMotionResult.CONTINUE;

		return DND.DragMotionResult.COPY_DROP;
	},

	acceptDrop: function(source, actor, x, y, time) {
		let appInfo = this._getSourceAppInfo(source);
		if (!appInfo)
			return false;

		this.emit('app-dropped');

		let desktop = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);

		let src = Gio.File.new_for_path(appInfo.get_filename());
		let dst = Gio.File.new_for_path(GLib.build_filenamev([desktop, src.get_basename()]));

		try {
			// copy_async() isn't introspectable :-(
			src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
			this._markTrusted(dst);
		} catch(e) {
			log('Failed to copy to desktop: ' + e.message);
		}

		return true;
	}
});
Signals.addSignalMethods(DesktopTarget.prototype);




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


//Applications Menu class (which is called a button for some reason)
const ApplicationsMenu = new Lang.Class({
	Name: 'ApplicationsMenu',
	Extends: PanelMenu.Button,

	// Init
	// TODO(check for redundant declarations and add everything necessary into destroy function)
	_init: function(settings) {
		this._settings = settings;
		this.parent(1.0, null, false);
		this._session = new GnomeSession.SessionManager();

		// Lists and other variables
		this.reloadFlag = false;																		// Reload later flag
		this.searchActive = false;																		//
		this.currentCategory = null;																	// Current Category (for reloading changes)
		this.placesManager = null;																		// Places Manager
		this.searchEntryText = null;																	// Search text that will get entered by user
		this._searchIconClickedId = 0;																	// 

		this.applicationsByCategory = {};																// 
		this._allAppsList = new Array();																// All Apps list
		this._frequentApps = new Array();																// Frequent Apps List
		this._favorites = new Array();																	// Favorite Apps List
		this._places = new Array();																		// Places List
		this._recent = new Array();																		// Recent Files List
		this._menyy_favorites = new Array();															// Custom Favorites List (for use later)

		// Settings
		// TODO(UPDATE COLUMN COUNT AND CATEGORIES VIEW MODE SETTINGS)
		this._appGridColumns = this._settings.get_int('apps-grid-column-count');						// Grid Column Count
		this._appsViewMode = this._settings.get_enum('apps-viewmode');									// Apps View Mode (grid or list or other)
		this._categoriesViewMode = this._settings.get_enum('categories-viewmode');						// Categories View Mode (left, right, combined with apps or accordion)
		this._appGridButtonWidth = 64;																	// TODO(ADD SETTING)
		this.hoverDelay =  this._settings.get_int('categories-hover-delay');							// hoverDelay
		this.selectionMethod = null;																	// Click or hover category

		// Panel button stuff
		this._menuButtonWidget = new MenuButtonWidget();
		this.actor.add_actor(this._menuButtonWidget);
		this.setMenu(new ApplicationsPopupMenu(this.actor, 1.0, St.Side.TOP, this, this._settings));




		//Drag to desktop
		this._desktopTarget = new DesktopTarget();
		this._desktopTarget.connect('app-dropped', () => {
			this.menu.close();
		});
		this._desktopTarget.connect('desktop-changed', () => {
			this._applicationsButtons.forEach(item => {
				item.setDragEnabled(this._desktopTarget.hasDesktop);
			});
		});




		//Main.panel.menuManager.addMenu(this.menu);													// What was this line for?
		//this.actor.accessible_role = Atk.Role.LABEL;													// What was this line for?
		//this.actor.name = 'panelApplications';														// Was it necessary at all?
		//this.actor.connect('captured-event', Lang.bind(this, this._onCapturedEvent));					// Was it necessary at all?
		//this._showingId = Main.overview.connect('showing', Lang.bind(this, function() {				// What was this line for?
		//	this.actor.add_accessible_state (Atk.StateType.CHECKED);									// What was this line for?
		//}));																							// What was this line for?
		//this._hidingId = Main.overview.connect('hiding', Lang.bind(this, function() {					// What was this line for?
		//	this.actor.remove_accessible_state (Atk.StateType.CHECKED);									// What was this line for?
		//}));																							// What was this line for?


		// Run functions
		this._firstCreateLayout();
		this._display();																				// 
		// Load stuff into memory for a minor speed improvement
		this._loadFavorites();																			// Load Favorites into memory
		this._loadFrequent();																			// Load Frequent into memory
		this._loadAllAppsList();																		// Load All apps list into memory
		this._loadHome();																				// Load homescreen applications into memory

		// This should be in the controller anyway!
		// TODO(send this into controller)
		/*
		this._installedChangedId = appSys.connect('installed-changed', Lang.bind(this, function() {
			if (this.menu.isOpen) {
				this._redisplay();
				this.mainBox.show();
			} else {
				this.reloadFlag = true;
			}
		}));
		 */
		//this._panelBoxChangedId = Main.layoutManager.connect('panel-box-changed', Lang.bind(this, function() {
		//	container.queue_relayout();
		//}));
		Main.panel.actor.connect('notify::height', Lang.bind(this,
				function() {
			this._redisplay();
		}));



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
		//this.altBox.hide();

		this._createLayout();
		//this._createAltLayout();
	},

	// Right Click Menu
	_createAltLayout: function() {
		this.rightClickBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-rightClick-box menyy-spacing', x_align: St.Align.END});
		//this.rightClickScrollBox = new St.ScrollView({x_fill: true, y_fill: true, y_align: St.Align.START, style_class: 'vfade menyy-rightClickScroll-box-scrollview' });
		//this.rightClickScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		//let vScrollRightClick = this.rightClickScrollBox.get_vscroll_bar();
		//vScrollRightClick.connect('scroll-start', Lang.bind(this, function() {
		//	this.menu.passEvents = true;
		//}));
		//vScrollRightClick.connect('scroll-stop', Lang.bind(this, function() {
		//	this.menu.passEvents = false;
		//}));
		//Scroll should never be needed here :D
		//this.rightClickScrollBox.add_actor(this.rightClickBox, {expand: true, x_fill: true, y_fill: true});
		//this.altBox.add(this.rightClickScrollBox, {expand: true, x_fill: true, y_fill: true});
		this.altBox.add(this.rightClickBox, {expand: true, x_fill: true, y_fill: true});


		//Load the friggin Menu!
		this._loadRightClick();		
	},

	_createLayout: function() {
		// Menu Vertical layout!
		this.topBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-top-box menyy-spacing' });
		//TODO(START USING THIS!)
		this.centerBox = new St.BoxLayout({ vertical: false, style_class: 'menyy-center-box menyy-spacing' , y_align: St.Align.END });
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
		/*
		 * this.systemBoxContainer = new St.BoxLayout({ vertical: true,
		 * style_class: 'menyy-system-box-container', y_align: St.Align.END });
		 */
		this.systemBox = new PopupMenu.PopupBaseMenuItem({ reactive: false,
			can_focus: false, style_class: 'menyy-system-box menyy-spacing'});









		// Categories, main display, places and homescreen
		if (this._categoriesViewMode != CategoriesViewMode.COMBINED) {
			this.categoryBox = new St.BoxLayout({ vertical: true, style_class: 'menyy-categories-box-inside menyy-spacing' });
		}
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
		let vScrollApps = this.appsScrollBox.get_vscroll_bar();
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
		let vScrollHome = this.homeScrollBox.get_vscroll_bar();
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
			let vscroll2 = this.categoryScrollBox.get_vscroll_bar();
			vscroll2.connect('scroll-start', Lang.bind(this, function() {
				this.menu.passEvents = true;
			}));
			vscroll2.connect('scroll-stop', Lang.bind(this, function() {
				this.menu.passEvents = false;
			}));
			this.categoryScrollBox.add_actor(this.categoryBox);
		}




		// Places Scroll
		this.placesScrollBox = new St.ScrollView({x_fill: true, y_fill: true, y_align: St.Align.START, style_class: 'vfade menyy-places-box-scrollview' });
		this.placesScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
		let vScrollPlaces = this.placesScrollBox.get_vscroll_bar();
		vScrollPlaces.connect('scroll-start', Lang.bind(this, function() {
			this.menu.passEvents = true;
		}));
		vScrollHome.connect('scroll-stop', Lang.bind(this, function() {
			this.menu.passEvents = false;
		}));
		this.homeScrollBox.add_actor(this.homeBoxWrapper);


		// Add Home and Apps into a container
		this.appsScrollBoxContainer = new St.BoxLayout({ vertical: true, style_class: 'menyy-top-box menyy-spacing' });
		this.appsScrollBoxContainer.add(this.appsScrollBox, {expand: true});
		this.appsScrollBoxContainer.add(this.homeScrollBox, {expand: true});
		// TODO(CHECK IF NECESSARY AT ALL)
		//this.homeScrollBox.hide();																							// Hide by default



		// Add Vertical layout boxes
		this.mainBox.add(this.topBox);
		this.mainBox.add(this.centerBox);
		this.mainBox.add(this.bottomBox);


		// Add to top or bottom
		// TODO(REDO THIS WHOLE PART FOR IMPROVED CUSTOMIZEABILITY
		// TODO(CONNECT WITH SETTINGS AND ADD LISTENER)
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

		// TODO(CONNECT WITH SETTINGS AND ADD LISTENER)
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
			this.backButton = new BackMenuItem(this, 'backtoCategories');
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





		// Add system buttons to menu
		// TODO(ADD SYSTEM BUTTONS CONTAINER)
		// TODO(ADD POSSIBILITY FOR SYSTEM BUTTONS SEPARATE MENU)
		// TODO(ADD POSSIBILITY FOR SYSTEM BUTTONS TO EXPAND, IF ROOM LIMITED)
		// TODO(ADD SETTINGS ON SHOW HIDE PER BUTTON)
		// TODO(CHECK IF LOCK SCREEN EVEN POSSIBLE)
		// TODO(ADD CUSTOM LOCK SCREEN EVENTUALLY)
		// TODO(MAKE BUTTONS REARRANGEABLE)

		/*
		 * let shellrestart = new ShellButton(this);
		 * this.systemBox.actor.add(shellrestart.actor, { expand: false, x_fill:
		 * false, y_align: St.Align.START });
		 */

		let logout = new LogoutButton(this);
		this.systemBox.actor.add(logout.actor, { expand: false,
			x_fill: false,
			y_align: St.Align.START
		});

		/*
		 * let lock = new LockButton(this); this.systemBox.actor.add(lock.actor, {
		 * expand: false, x_fill: false, y_align: St.Align.START });
		 */

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

		// RELOAD LAYOUT RELATED SETTINGS!
		this._appsViewMode = this._settings.get_enum('apps-viewmode');
		this._categoriesViewMode = this._settings.get_enum('categories-viewmode');
		this._appGridColumns = this._settings.get_int('apps-grid-column-count');
		// TODO(LOAD HOME SCREEN SETTINGS)

		// CREATE LAYOUT
		this._createLayout();
		this._loadHome();
	},


	// Sets layout size according to settings
	// TODO(MAKE CLEANER VERSION OF LAYOUT STYLE FUNCTION)
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










		// Right Click
		this.rightClickBox.set_style(
				'min-height: 0px; ' +
				'max-height: 900px ;' +		// TODO(CONNECT this to screen resolution)
				'min-width: 290px; ' + 		// Trial and error to see an appropriate one :D
				'max-width: 900px; '		// TODO(CONNECT this to screen resolution)
		);
	},

	// TOGGLE MENU FUNCTION
	_toggleMenu: function() {
		this.mainBox.show();
		this.altBox.hide();
		this.menu.toggle();
		return Clutter.EVENT_STOP;
	},

	// Panel button widget get function
	_getWidget: function() {
		return this._menuButtonWidget;
	},


	// Load Default Apps Panel Items
	_loadHome: function() {
		if (HomeViewSettings != HomeView.CATEGORIES) {
			if (this.homeBox)
				this.homeBox.destroy_all_children();
			this._displayButtons(_, this._listApplications(HomeViewSettings));
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

	// Load All Apps
	_loadAllAppsList: function () {
		this._allAppsList = [];
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

	// Load data for all menu categories
	_loadCategories: function() {
		let column = 0;
		let rownum = 0;
		let gridLayout = this.appsBox.layout_manager;
		// this._loadFavorites();
		// this._loadFrequent();
		this.applicationsByCategory = {};
		let tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
		tree.load_sync();
		let root = tree.get_root_directory();
		let iter = root.iter();
		let nextType;
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
		let favAppCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			favAppCategory = new CategoryGridButton('favorites', _('Favorite Apps'), 'applications-other');
			favAppCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(favAppCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			favAppCategory = new CategoryListButton('favorites', _('Favorite Apps'), 'applications-other');
		}

		favAppCategory.setButtonEnterCallback(Lang.bind(this, function() {
			favAppCategory.actor.add_style_class_name('selected');
			// this.selectedAppTitle.set_text(freqAppCategory.label.get_text());
			// this.selectedAppDescription.set_text('');

			if (favAppCategory._ignoreHoverSelect)
				return;

			if (this.selectionMethod == SelectMethod.HOVER ) {
				this._hoverTimeoutId = Mainloop.timeout_add((this.hoverDelay >0) ? this.hoverDelay : 0, Lang.bind(this, function() {
					this._selectCategory(favAppCategory);
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
		let allAppsCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			allAppsCategory = new CategoryGridButton('all', _('All Applications'), 'applications-other');
			allAppsCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(allAppsCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			allAppsCategory = new CategoryListButton('all', _('All Applications'), 'applications-other');
		}
		allAppsCategory.setButtonEnterCallback(Lang.bind(this, function() {
			allAppsCategory.actor.add_style_class_name('selected');
			// this.selectedAppTitle.set_text(allAppsCategory.label.get_text());
			// this.selectedAppDescription.set_text('');

			if (allAppsCategory._ignoreHoverSelect)
				return;

			if (this.selectionMethod == SelectMethod.HOVER ) {
				this._hoverTimeoutId = Mainloop.timeout_add((this.hoverDelay >0) ? this.hoverDelay : 0, Lang.bind(this, function() {
					this._selectCategory(allAppsCategory);
					this._hoverTimeoutId = 0;
				}));
			}
		}));
		allAppsCategory.setButtonLeaveCallback(Lang.bind(this, function() {
			allAppsCategory.actor.remove_style_class_name('selected');
			// this.selectedAppTitle.set_text('');
			// this.selectedAppDescription.set_text('');

			if (this.selectionMethod == SelectMethod.HOVER ) {
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
		let freqAppCategory;
		if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
			freqAppCategory = new CategoryGridButton('frequent', _('Frequent Apps'), 'applications-other');
			freqAppCategory.buttonbox.width = this._appGridButtonWidth;
			gridLayout.pack(freqAppCategory.actor, column, rownum);
			column ++;
			if (column > this._appGridColumns-1) {
				column = 0;
				rownum ++;
			}
		} else {
			freqAppCategory = new CategoryListButton('frequent', _('Frequent Apps'), 'applications-other');
		}


		freqAppCategory.setButtonEnterCallback(Lang.bind(this, function() {
			freqAppCategory.actor.add_style_class_name('selected');
			// this.selectedAppTitle.set_text(freqAppCategory.label.get_text());
			// this.selectedAppDescription.set_text('');

			if (freqAppCategory._ignoreHoverSelect)
				return;

			if (this.selectionMethod == SelectMethod.HOVER ) {
				this._hoverTimeoutId = Mainloop.timeout_add((this.hoverDelay >0) ? this.hoverDelay : 0, Lang.bind(this, function() {
					this._selectCategory(freqAppCategory);
					this._hoverTimeoutId = 0;
				}));
			}
		}));
		freqAppCategory.setButtonLeaveCallback(Lang.bind(this, function() {
			freqAppCategory.actor.remove_style_class_name('selected');
			// this.selectedAppTitle.set_text('');
			// this.selectedAppDescription.set_text('');


			if (this.selectionMethod == SelectMethod.HOVER ) {
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
		//TODO (CLEAN THIS MESS UP!)
		while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
			if (nextType == GMenu.TreeItemType.DIRECTORY) {
				let dir = iter.get_directory();
				let categoryId = dir.get_menu_id();
				this.applicationsByCategory[categoryId] = [];
				// this._loadCategories(dir);
				this._loadCategory(categoryId, dir);
				if (this.applicationsByCategory[dir.get_menu_id()].length>0){
					let appCategory;
					if ((this._categoriesViewMode == CategoriesViewMode.COMBINED) && (this._appsViewMode == ApplicationsViewMode.GRID)) {
						appCategory = new CategoryGridButton(dir);
						appCategory.buttonbox.width = this._appGridButtonWidth;
						gridLayout.pack(appCategory.actor, column, rownum);
						column ++;
						if (column > this._appGridColumns-1) {
							column = 0;
							rownum ++;
						}
					} else {
						appCategory = new CategoryListButton(dir);
					}
					appCategory.setButtonEnterCallback(Lang.bind(this, function() {
						appCategory.actor.add_style_class_name('selected');
						// this.selectedAppTitle.set_text(appCategory.label.get_text());
						// this.selectedAppDescription.set_text('');

						if (appCategory._ignoreHoverSelect)
							return;

						if (this.selectionMethod == SelectMethod.HOVER ) {
							this._hoverTimeoutId = Mainloop.timeout_add((this.hoverDelay >0) ? this.hoverDelay : 0, Lang.bind(this, function() {
								this._selectCategory(appCategory);
								this._hoverTimeoutId = 0;
							}));
						}
					}));
					appCategory.setButtonLeaveCallback(Lang.bind(this, function() {
						appCategory.actor.remove_style_class_name('selected');
						// this.selectedAppTitle.set_text('');
						// this.selectedAppDescription.set_text('');

						if (this.selectionMethod == SelectMethod.HOVER ) {
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
			if (HomeViewSettings != HomeView.CATEGORIES) this.backToButton.actor.show();
			this.goToButton.actor.hide();
		}
	},

	// Load right click menu
	// TODO(ADD PROPER RIGHT CLICK OPTIONS)
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
		shortcutType = ApplicationType.PLACE;
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
		// TODO( ADD SOME SOFTWARE TO PLACES)
		// TODO( MAKE PLACES REARRANGEABLE AND PER GROUP SETTINGS)
		if (true){
			let places = this._listPlaces();
			let bookmarks = this._listBookmarks();
			let devices = this._listDevices();
			let allPlaces = places.concat(bookmarks.concat(devices));
			shortcuts = allPlaces;
			shortcutType = ApplicationType.PLACE;
		} else {
			shortcuts = this._favorites;
			shortcutType = ApplicationType.APPLICATION;
		}
		for (let i = 0; i < shortcuts.length; ++i) {
			let app = shortcuts[i];
			// TODO( ADD FUNCTIONALITY TO THE BUTTON INSTEAD OR USE APPLICATION BUTTON!)
			let shortcutButton = new ShortcutButton(app, shortcutType);
			this.placesBox.add_actor(shortcutButton.actor);
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

	/*
	 *  //LOADS WEB BOOKMARKS
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
	// TODO(ADD RECENT APPS)
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
	 * this.placesBox.add_actor(placeMenuItem.actor); } },
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
					let appListButton = new AppListButton(app, this, appType);
					this.homeBox.add_actor(appListButton.actor);
				} else {
					//TODO(ADD GRID FUNCTIONALITY TO THE BUTTON INSTEAD)
					let includeTextLabel = true;
					let appGridButton = new AppGridButton(app, appType, includeTextLabel);
					this._appGridButtonWidth = 64;
					appGridButton.buttonbox.width = this._appGridButtonWidth;
					appGridButton.actor.connect('enter-event', Lang.bind(this, function() {
						appGridButton.actor.add_style_class_name('selected');
					}));
					appGridButton.actor.connect('leave-event', Lang.bind(this, function() {
						appGridButton.actor.remove_style_class_name('selected');
					}));
					appGridButton.actor.connect('button-press-event', Lang.bind(this, function() {
						appGridButton.actor.add_style_pseudo_class('pressed');
					}));
					appGridButton.actor.connect('button-release-event', Lang.bind(this, function() {
						appGridButton.actor.remove_style_pseudo_class('pressed');
						appGridButton.actor.remove_style_class_name('selected');
						appGridButton._app.open_new_window(-1);
						this.menu.close();
					}));
					let gridLayout = this.homeBox.layout_manager;
					gridLayout.pack(appGridButton.actor, column, rownum);
					column ++;
					if (column > this._appGridColumns-1) {
						column = 0;
						rownum ++;
					}
				}
			}
		}

		if (apps){
			appType = ApplicationType.APPLICATION;
			for (let i in apps) {
				let app = apps[i];
				if (this._appsViewMode == ApplicationsViewMode.LIST) { // ListView
					let appListButton = new AppListButton(app, this, appType);
					this.appsBox.add_actor(appListButton.actor);
				} else { // GridView
					// TODO(ADD GRID FUNCTIONALITY TO THE BUTTON INSTEAD)
					// TODO(ADD SETTINGS FOR APPS GRID LABEL WIDTH)
					// TODO(ADD SETTINGS FOR SEPARATE GRID ICON SIZE!)
					// let includeTextLabel =
					// (settings.get_int('apps-grid-label-width') > 0) ? true :
					// false;
					let includeTextLabel = true;
					let appGridButton = new AppGridButton(app, appType, includeTextLabel);
					// TODO(ADD APPGRIDBUTTONWIDTH TO SETTINGS!
					this._appGridButtonWidth = 64;
					appGridButton.buttonbox.width = this._appGridButtonWidth;
					appGridButton.actor.connect('enter-event', Lang.bind(this, function() {
						appGridButton.actor.add_style_class_name('selected');
					}));
					appGridButton.actor.connect('leave-event', Lang.bind(this, function() {
						appGridButton.actor.remove_style_class_name('selected');
					}));
					appGridButton.actor.connect('button-press-event', Lang.bind(this, function() {
						appGridButton.actor.add_style_pseudo_class('pressed');
					}));
					appGridButton.actor.connect('button-release-event', Lang.bind(this, function() {
						appGridButton.actor.remove_style_pseudo_class('pressed');
						appGridButton.actor.remove_style_class_name('selected');
						appGridButton._app.open_new_window(-1);
						this.menu.close();
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
	},

	// Scroll to a specific button (menu item) in the applications scroll view
	// TODO(CHECK IF NECESSARY!)
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




	//TODO(CLEAN UP SELECTCATEGORY CODE)
	_selectCategory: function(button) {
		this._clearAppsBox();
		if (button){
			let category = button._dir || button;
			this.currentCategory = category;
			if (category == 'default') {
				if (HomeViewSettings != HomeView.CATEGORIES) {
					this.homeScrollBox.show();
					this.appsScrollBox.hide();
				} else {
					// Recursion, selects categories instead
					this._selectCategory('categories');
				}
				if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
					if (HomeViewSettings != HomeView.CATEGORIES) this.goToButton.actor.show();
					this.backButton.actor.hide();
					this.backToButton.actor.hide();
				}
			} else if (category == 'categories'){
				this.homeScrollBox.hide();
				this.appsScrollBox.show();
				// this._loadCategories();
				if (this._categoriesViewMode == CategoriesViewMode.COMBINED) {
					this._loadCategories();
					if (HomeViewSettings != HomeView.CATEGORIES) this.backToButton.actor.show();
					this.backButton.actor.hide();
					this.goToButton.actor.hide();
				}
			} else if (typeof category == 'string') {
				this.homeScrollBox.hide();
				this.appsScrollBox.show();
				// this._displayApplications(this._listApplications(category));
				this._displayButtons(this._listApplications(category));
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






	// TODO(CLEAN UP APPLICATION LIST CODE, IF POSSIBLE)
	// Get a list of applications for the specified category or search query
	_listApplications: function(category_menu_id, pattern) {
		let applist;


		// Loading categories for home screen
		if (typeof category_menu_id == 'number'){
			if (category_menu_id == 0) {
				// Skip for now
			} else if (category_menu_id == 1) {
				this._loadCategories();
			} else if (category_menu_id == 2) {
				applist = this._frequentApps;
				// global.log("menyy: getting applist freq")
			} else if (category_menu_id == 3) {
				applist = this._favorites;
			} else if (category_menu_id == 4) {
				// Skip for now
			} else if (category_menu_id == 6) {
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
			} else if (category_menu_id == 'menyy') {
				// do something once done
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


	// Handle search text entry input changes
	_onSearchTextChanged: function (se, prop) {
		let searchString = this.searchEntry.get_text();

		//If text is "force shell restart", then restart the shell
		//VEEEERRRRYY USEFUL FOR DEBUGGING AND DEVELOPMENT!
		//global.log("menyy: search: " + searchString);
		if (searchString == 'force shell restart') {
			global.log("menyy: RESTART THROUGH SEARCH")
			global.reexec_self();
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
			// TODO(FIX / ADD ASYNC SEARCH)
			// TODO(ADD SEARCH LAST BUTTON PRESS TIMEOUT)
			// this._doAsyncSearch();

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
		this.homeScrollBox.hide();
		this.appsScrollBox.show();
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
			this._applicationsButtons = new Array();
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
		//Destroy starting from deepest and ending at section
		//Current Layout looks kind of like this!
		//section--------------------------------------------------
		//mainBox----------------------------------------------
		//topBox-------------------------------------------
		//leftbox--------------------------------------
		//appsScrollBoxContainer-------------------
		//appsScrollBox------------------------
		//appsBoxWrapper-------------------
		//appsBox----------------------
		//homeScrollBox------------------------
		//homeBoxWrapper-------------------
		//homeBox----------------------
		//backButton-------------------------------
		//backToButton-----------------------------
		//goToButton-------------------------------
		//rightBox-------------------------------------
		//placesScrollBox--------------------------
		//placesBox----------------------------
		//centerBox----------------------------------------
		//bottomBox----------------------------------------
		//searchBox------------------------------------
		//searchEntry------------------------------
		//systemBox------------------------------------
		//altBox-----------------------------------------------
		//rightClickBox------------------------------------
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
