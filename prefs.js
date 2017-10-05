/*
 *  Menüü settings
 */






/*
 * Based on Arc Menu: The new applications menu for Gnome 3 by
 *
 * Copyright (C) 2017 LinxGem33, Alexander Rüedlinger
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
 
// Import Libraries
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Menyy = ExtensionUtils.getCurrentExtension();
const convenience = Menyy.imports.convenience;
const constants = Menyy.imports.constants;
const AM = Menyy.imports.am;

const Gettext = imports.gettext.domain(Menyy.metadata['gettext-domain']);
const _ = Gettext.gettext;

/*
 * Menyy Preferences Widget
 */
const MenyyPreferencesWidget= new GObject.Class({
    Name: 'Menyy.MenyyPreferencesWidget',
    GTypeName: 'MenyyPreferencesWidget',
    Extends: Gtk.Box,

    _init: function() {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            border_width: 5
        });
        this.settings = convenience.getSettings(Menyy.metadata['settings-schema']);
        
        let notebook = new AM.Notebook();
        
        let behaviourSettingsPage = new BehaviourSettingsPage(this.settings);
        notebook.append_page(behaviourSettingsPage, behaviourSettingsPage.title);
        
        let layOutPage = new LayOutPage(this.settings);
        notebook.append_page(layOutPage, layOutPage.title);
        
        let iconsPage = new IconsPage(this.settings);
        notebook.append_page(iconsPage, iconsPage.title);
        
        let panelButtonPage = new PanelButtonPage(this.settings);
        notebook.append_page(panelButtonPage, panelButtonPage.title);
        
        let searchPage = new SearchPage(this.settings);
        notebook.append_page(searchPage, searchPage.title);

        let aboutPage = new AboutPage(this.settings);
        notebook.append_page(aboutPage, aboutPage.title);

        this.add(notebook);
    }
});

/*
 * Behaviour Settings Page
 */
const BehaviourSettingsPage = new Lang.Class({
    Name: 'BehaviourSettingsPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Behaviour'));
        this.settings = settings;

        /*
         * Hot Corner Box
         */
        let disableHotCornerFrame = new AM.FrameBox();
        let disableHotCornerRow = new AM.FrameBoxRow();
        let disableHotCornerLabel = new Gtk.Label({
            label: _("Disable activities hot corner"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let disableHotCornerSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        disableHotCornerSwitch.set_active(this.settings.get_boolean('disable-activities-hotcorner'));
        disableHotCornerSwitch.connect('notify::active', Lang.bind(this, function(check) {
            this.settings.set_boolean('disable-activities-hotcorner', check.get_active());
        }));
        disableHotCornerRow.add(disableHotCornerLabel);
        disableHotCornerRow.add(disableHotCornerSwitch);
        disableHotCornerFrame.add(disableHotCornerRow);

        /*
         * Menu Hotkey and Keybinding Frame Box
         */
        let menuKeybindingFrame = new AM.FrameBox();

        // first row: hot key
        let menuHotkeyRow = new AM.FrameBoxRow();
        let menuHotkeyLabel = new Gtk.Label({
            label: _("Set menu hotkey"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let menuHotkeyCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        menuHotkeyCombo.append_text(_("Undefined"));
        menuHotkeyCombo.append_text(_("Left Super Key"));
        menuHotkeyCombo.append_text(_("Right Super Key"));
        menuHotkeyCombo.set_active(this.settings.get_enum('menu-hotkey'));
        menuHotkeyCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('menu-hotkey', widget.get_active());
        }));
        menuHotkeyRow.add(menuHotkeyLabel);
        menuHotkeyRow.add(menuHotkeyCombo);
        menuKeybindingFrame.add(menuHotkeyRow);

        // second row: custom Keybinding
        let menuKeybindingRow = new AM.FrameBoxRow();
        let menuKeybindingLabel = new Gtk.Label({
            label: _("Enable custom menu keybinding"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let menuKeybindingDescriptionRow = new AM.FrameBoxRow();
        let menuKeybindingDescriptionLabel = new Gtk.Label({
            label: _("Syntax: <Shift>, <Ctrl>, <Alt>, <Super>")
        });

        let menuKeybindingSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        menuKeybindingSwitch.set_active(this.settings.get_boolean('enable-menu-keybinding'));
        menuKeybindingSwitch.connect('notify::active', Lang.bind(this, function(check) {
            this.settings.set_boolean('enable-menu-keybinding', check.get_active());
        }));
        let menuKeybindingEntry = new Gtk.Entry({ halign: Gtk.Align.END });
        menuKeybindingEntry.set_width_chars(15);
        menuKeybindingEntry.set_text(this.settings.get_string('menu-keybinding-text'));
        menuKeybindingEntry.connect('changed', Lang.bind(this, function(entry) {
            let _menuKeybinding = entry.get_text();
            //TODO: catch possible user mistakes
            this.settings.set_string('menu-keybinding-text', _menuKeybinding);
            // Always deactivate the menu keybinding after it has been changed.
            // By that we avoid pssible "UX" or sync bugs.
            menuKeybindingSwitch.set_active(false);
        }));
        menuKeybindingRow.add(menuKeybindingLabel);
        menuKeybindingRow.add(menuKeybindingEntry);
        menuKeybindingRow.add(menuKeybindingSwitch);
        menuKeybindingDescriptionRow.add(menuKeybindingDescriptionLabel);

        menuKeybindingFrame.add(menuKeybindingRow);
        menuKeybindingFrame.add(menuKeybindingDescriptionRow);

        // add the frames
        this.add(disableHotCornerFrame);
        this.add(menuKeybindingFrame);
        
        
        
        
        
        /*
         * Homeview settings
         */
        let homeViewFrame = new AM.FrameBox();

        // first row: hot key
        let homeViewRow = new AM.FrameBoxRow();
        let homeViewLabel = new Gtk.Label({
            label: _("Set Default Category"),
            xalign: 0,
            hexpand: true
        });
        let homeViewCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        homeViewCombo.append_text(_("Categories"));
        homeViewCombo.append_text(_("Frequent"));
        homeViewCombo.append_text(_("Favorites"));
        homeViewCombo.append_text(_("All"));
        homeViewCombo.append_text(_("Recent"));
        //homeViewCombo.append_text(_("Shortcuts"));
        homeViewCombo.set_active(this.settings.get_enum('default-category'));
        homeViewCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('default-category', widget.get_active());
        }));
        homeViewRow.add(homeViewLabel);
        homeViewRow.add(homeViewCombo);
        homeViewFrame.add(homeViewRow);
        this.add(homeViewFrame);
        
        
        /*
         * Hover setting
         */
        // hover enable?
        let hoverFrame = new AM.FrameBox();
        let enableHoverRow = new AM.FrameBoxRow();
        let enableHoverLabel = new Gtk.Label({
            label: _("Categories select on hover: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let enableHoverSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        enableHoverSwitch.set_active(this.settings.get_enum('categories-selection-method'));
        enableHoverSwitch.connect('notify::active', Lang.bind(this, function(check) {
            this.settings.set_enum('categories-selection-method', check.get_active());
        }));
        enableHoverRow.add(enableHoverLabel);
        enableHoverRow.add(enableHoverSwitch);
        hoverFrame.add(enableHoverRow);
        
        
        let hoverTimeRow = new AM.FrameBoxRow();
        let hoverTimeSliderRow = new AM.FrameBoxRow();
        let hoverTimeLabel = new Gtk.Label({
            label: _("Categories hover delay: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        var hoverTimeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,1024.0,1.0);
        hoverTimeSlider.set_value(this.settings.get_int("categories-hover-delay"));
        hoverTimeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('categories-hover-delay', hoverTimeSlider.get_value());
        }));
        hoverTimeSlider.set_property ("expand", true);
        hoverTimeRow.add(hoverTimeLabel);
        hoverTimeSliderRow.add(hoverTimeSlider);
        hoverFrame.add(hoverTimeRow);
        hoverFrame.add(hoverTimeSliderRow);
        this.add(hoverFrame);
        
        
        
        /*
         * Search Timeout switch
         */
        let searchTimeOutFrame = new AM.FrameBox();
        let searchTimeOutRow = new AM.FrameBoxRow();
        let searchTimeOutLabel = new Gtk.Label({
            label: _("Wait for search input: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let searchTimeOutSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        searchTimeOutSwitch.set_active(this.settings.get_boolean('search-timeout'));
        searchTimeOutSwitch.connect('notify::active', Lang.bind(this, function(check) {
            this.settings.set_boolean('search-timeout', check.get_active());
        }));
        searchTimeOutRow.add(searchTimeOutLabel);
        searchTimeOutRow.add(searchTimeOutSwitch);
        searchTimeOutFrame.add(searchTimeOutRow);
        this.add(searchTimeOutFrame);
        
        /*
         * Search Timeout Time
         */
        let searchTimeRow = new AM.FrameBoxRow();
        let searchTimeSliderRow = new AM.FrameBoxRow();
        let searchTimeLabel = new Gtk.Label({
            label: _("Search delay: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        var searchTimeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 100.0,1024.0,1.0);
        searchTimeSlider.set_value(this.settings.get_int('search-timeout-time'));
        searchTimeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('search-timeout-time', searchTimeSlider.get_value());
        }));
        searchTimeSlider.set_property ("expand", true);
        searchTimeRow.add(searchTimeLabel);
        searchTimeSliderRow.add(searchTimeSlider);
        searchTimeOutFrame.add(searchTimeRow);
        searchTimeOutFrame.add(searchTimeSliderRow);
        this.add(searchTimeOutFrame);
        

    }
});

const PanelButtonPage = new Lang.Class({
    Name: 'PanelButtonPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Panel'));
        this.settings = settings;

        /*
         * Menu Button Appearance Frame Box
         */
        let menuButtonAppearanceFrame = new AM.FrameBox();
        let menuButtonAppearanceRow = new AM.FrameBoxRow();
        let menuButtonAppearanceLabel = new Gtk.Label({
            label: _("Customize menu button appearance"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let menuButtonAppearanceSettingsButton = new AM.IconButton({
            circular: true,
            icon_name: 'emblem-system-symbolic'
        });
        let menuButtonAppearanceCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        menuButtonAppearanceCombo.append_text(_("Icon"));
        menuButtonAppearanceCombo.append_text(_("Text"));
        menuButtonAppearanceCombo.append_text(_("Icon and Text"));
        menuButtonAppearanceCombo.append_text(_("Text and Icon"));
        menuButtonAppearanceCombo.set_active(this.settings.get_enum('menu-button-appearance'));
        menuButtonAppearanceCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('menu-button-appearance', widget.get_active());
        }));

        // Extra settings for the appearance of the menu button
        menuButtonAppearanceSettingsButton.connect('clicked',
        Lang.bind(this, function() {
            let dialog = new MenuButtonCustomizationWindow(this.settings, this);
            dialog.show_all();
        }));

        menuButtonAppearanceRow.add(menuButtonAppearanceLabel);
        menuButtonAppearanceRow.add(menuButtonAppearanceSettingsButton);
        menuButtonAppearanceRow.add(menuButtonAppearanceCombo);
        menuButtonAppearanceFrame.add(menuButtonAppearanceRow);
        this.add(menuButtonAppearanceFrame);

        /*
         * Menu Position Box
         */
        let menuPositionFrame = new AM.FrameBox();
        let menuPositionRow = new AM.FrameBoxRow();
        let menuPositionBoxLabel = new Gtk.Label({
            label: _("Menu position in panel"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let menuPositionLeftButton = new Gtk.RadioButton({
        	label: _('Left')
        });
        let menuPositionCenterButton = new Gtk.RadioButton({
        label: _('Center'),
        group: menuPositionLeftButton
        });
        let menuPositionRightButton = new Gtk.RadioButton({
            label: _('Right'),
            group: menuPositionLeftButton
        });
        // callback handlers for the radio buttons
        menuPositionLeftButton.connect('clicked', Lang.bind(this, function() {
            this.settings.set_enum('position-in-panel', constants.MENU_POSITION.Left);
        }));
        menuPositionCenterButton.connect('clicked', Lang.bind(this, function() {
            this.settings.set_enum('position-in-panel', constants.MENU_POSITION.Center);
        }));
        menuPositionRightButton.connect('clicked', Lang.bind(this, function() {
            this.settings.set_enum('position-in-panel', constants.MENU_POSITION.Right);
        }));

        switch(this.settings.get_enum('position-in-panel')) {
            case constants.MENU_POSITION.Left:
                menuPositionLeftButton.set_active(true);
                break;
            case constants.MENU_POSITION.Center:
                menuPositionCenterButton.set_active(true);
                break;
            case constants.MENU_POSITION.Right:
                menuPositionRightButton.set_active(true);
                break;
        }

        menuPositionRow.add(menuPositionBoxLabel);
        menuPositionRow.add(menuPositionLeftButton);
        menuPositionRow.add(menuPositionCenterButton);
        menuPositionRow.add(menuPositionRightButton);
        menuPositionFrame.add(menuPositionRow);

        // add the frames
        this.add(menuPositionFrame);
    }
});

const MenuButtonCustomizationWindow = new Lang.Class({
    Name: 'MenuButtonCustomizationWindow',
    Extends: AM.DialogWindow,

    _init: function(settings, parent) {
        this._settings = settings;
        this.parent(_('Button appearance'), parent);
    },

    _createLayout: function(vbox) {
        /*
        * Text Appearance Frame
        */
        let menuButtonTextFrame = new AM.FrameBox();

        //first row
        let menuButtonTextBoxRow = new AM.FrameBoxRow();
        let menuButtonTextLabel = new Gtk.Label({
            label: _('Text for the menu button'),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let systemTextButton = new Gtk.RadioButton({
            label: _('System text')
        });
        let customTextButton = new Gtk.RadioButton({
            label: _('Custom text'),
            group: systemTextButton
        });
        //TODO: fix this hack
        systemTextButton.set_active(this._settings.get_enum('menu-button-text') == constants.MENU_BUTTON_TEXT.System);
        customTextButton.set_active(this._settings.get_enum('menu-button-text') == constants.MENU_BUTTON_TEXT.Custom);
        systemTextButton.connect('clicked', Lang.bind(this, function() {
            this._settings.set_enum('menu-button-text', constants.MENU_BUTTON_TEXT.System);
        }));
        customTextButton.connect('clicked', Lang.bind(this, function() {
            this._settings.set_enum('menu-button-text', constants.MENU_BUTTON_TEXT.Custom);
        }));
        menuButtonTextBoxRow.add(menuButtonTextLabel);
        menuButtonTextBoxRow.add(systemTextButton);
        menuButtonTextBoxRow.add(customTextButton);
        menuButtonTextFrame.add(menuButtonTextBoxRow);

        // second row
        let menuButtonCustomTextBoxRow = new AM.FrameBoxRow();
        let menuButtonCustomTextLabel = new Gtk.Label({
            label: _('Set custom text for the menu button'),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let menuButtonCustomTextEntry = new Gtk.Entry({ halign: Gtk.Align.END });
        menuButtonCustomTextEntry.set_width_chars(15);
        menuButtonCustomTextEntry.set_text(this._settings.get_string('custom-menu-button-text'));
        menuButtonCustomTextEntry.connect('changed', Lang.bind(this, function(entry) {
        let customMenuButtonText = entry.get_text();
            this._settings.set_string('custom-menu-button-text', customMenuButtonText);
        }));
        menuButtonCustomTextBoxRow.add(menuButtonCustomTextLabel);
        menuButtonCustomTextBoxRow.add(menuButtonCustomTextEntry);
        menuButtonTextFrame.add(menuButtonCustomTextBoxRow);

        // third row
        let menuButtonArrowIconBoxRow = new AM.FrameBoxRow();
        let menuButtonArrowIconLabel = new Gtk.Label({
            label: _('Enable the arrow icon beside the button text'),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let enableArrowIconSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        enableArrowIconSwitch.set_active(this._settings.get_boolean('enable-menu-button-arrow'));
        enableArrowIconSwitch.connect('notify::active', Lang.bind(this, function(check) {
             this._settings.set_boolean('enable-menu-button-arrow', check.get_active());
        }));
        menuButtonArrowIconBoxRow.add(menuButtonArrowIconLabel);
        menuButtonArrowIconBoxRow.add(enableArrowIconSwitch);
        menuButtonTextFrame.add(menuButtonArrowIconBoxRow);

        /*
        * Icon Appearance Frame
        */
        let menuButtonIconFrame = new AM.FrameBox();

        // first row
        let menuButtonIconBoxRow = new AM.FrameBoxRow();
        let menuButtonIconBoxLabel = new Gtk.Label({
            label: _('Select icon for the menu button'),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        // create file filter and file chooser button
        let fileFilter = new Gtk.FileFilter();
        fileFilter.add_pixbuf_formats();
        let fileChooserButton = new Gtk.FileChooserButton({
            action: Gtk.FileChooserAction.OPEN,
            title: _('Please select an image icon'),
            filter: fileFilter
        });
        fileChooserButton.connect('file-set', Lang.bind(this, function(fileChooserButton) {
            let iconFilepath = fileChooserButton.get_filename();
            this._settings.set_string('custom-menu-button-icon', iconFilepath);
            menuButtonIconCombo.set_active(constants.MENU_BUTTON_ICON.Custom);
        }));
        fileChooserButton.set_current_folder(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES));
        let iconFilepath = this._settings.get_string('custom-menu-button-icon');
        if(iconFilepath) {
            fileChooserButton.set_filename(iconFilepath);
        }

        let menuButtonIconCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        menuButtonIconCombo.append_text(_("Menyy Icon"));
        menuButtonIconCombo.append_text(_("System Icon"));
        menuButtonIconCombo.append_text(_("Custom Icon"));
        menuButtonIconCombo.set_active(this._settings.get_enum('menu-button-icon'));
        menuButtonIconCombo.connect('changed', Lang.bind(this, function(widget) {
            this._settings.set_enum('menu-button-icon', widget.get_active());
        }));

        menuButtonIconBoxRow.add(menuButtonIconBoxLabel);
        menuButtonIconBoxRow.add(fileChooserButton);
        menuButtonIconBoxRow.add(menuButtonIconCombo);
        menuButtonIconFrame.add(menuButtonIconBoxRow)

        // second row
        let menuButtonIconScaleBoxRow = new AM.FrameBoxRow();
        let iconSize = this._settings.get_double('custom-menu-button-icon-size');
        let menuButtonIconScaleBoxLabel = new Gtk.Label({
            label: _('Icon size\n(default is ' + constants.DEFAULT_ICON_SIZE + ')'),
            use_markup: true,
            xalign: 0
        });
        let hscale = new Gtk.HScale({
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 64,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            round_digits: 0,
            hexpand: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        hscale.connect('format-value', function(scale, value) { return value.toString() + ' px'; });
        constants.ICON_SIZES.forEach(function(num) {
            hscale.add_mark(num, Gtk.PositionType.BOTTOM, num.toString());
        });
        hscale.set_value(iconSize);
        hscale.connect('value-changed', Lang.bind(this, function(){
            this._settings.set_double('custom-menu-button-icon-size', hscale.get_value());
        }));

        menuButtonIconScaleBoxRow.add(menuButtonIconScaleBoxLabel);
        menuButtonIconScaleBoxRow.add(hscale);
        menuButtonIconFrame.add(menuButtonIconScaleBoxRow);

        // add the frames to the vbox
        vbox.add(menuButtonTextFrame)
        vbox.add(menuButtonIconFrame);
    }
});

/*
 * About Page
 */
const AboutPage = new Lang.Class({
    Name: 'AboutPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('About'));
        this.settings = settings;

        // Use meta information from metadata.json
        let releaseVersion = Menyy.metadata['version'] || 'bleeding-edge ;-)';
        let projectName = Menyy.metadata['name'];
        let projectDescription = Menyy.metadata['description'];
        let projectUrl = Menyy.metadata['url'];

        // Create GUI elements
        // Create the image box
        let logoPath = Menyy.path + constants.MENYY_LOGO.Path;
        let [imageWidth, imageHeight] = constants.MENYY_LOGO.Size;
        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, imageWidth, imageHeight);
        let menyyImage = new Gtk.Image({ pixbuf: pixbuf });
        let menyyImageBox = new Gtk.VBox({
            margin_top:5,
            margin_bottom: 5,
            expand: false
        });
        menyyImageBox.add(menyyImage);

        // Create the info box
        let menyyInfoBox = new Gtk.VBox({
            margin_top:5,
            margin_bottom: 5,
            expand: false
        });
	
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//
	//	  Load from json	//
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!//
        let menyyLabel = new Gtk.Label({
            label: '<b>' + _('Menüü') + '</b>',
            use_markup: true,
            expand: false
        });
        let versionLabel = new Gtk.Label({
        	label:  _('version: ') + releaseVersion,
        	expand: false
        });
        let projectDescriptionLabel = new Gtk.Label({
        	label:  _(projectDescription),
        	expand: false
        });
        let projectLinkButton = new Gtk.LinkButton({
            label: _('Webpage'),
            uri: projectUrl,
            expand: false
        });
        menyyInfoBox.add(menyyLabel);
        menyyInfoBox.add(versionLabel);
        menyyInfoBox.add(projectDescriptionLabel);
        menyyInfoBox.add(projectLinkButton);

        // Create the GNU software box
        let gnuSofwareLabel = new Gtk.Label({
            label: constants.GNU_SOFTWARE,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            expand: true
        });
        let gnuSofwareLabelBox = new Gtk.VBox({});
        gnuSofwareLabelBox.pack_end(gnuSofwareLabel,false, false, 0);

        this.add(menyyImageBox);
        this.add(menyyInfoBox);
        this.add(gnuSofwareLabel);
    }
});


const SearchPage = new Lang.Class({
    Name: 'SearchPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Search'));
        this.settings = settings;
        
        
        let searchWhereFrame = new AM.FrameBox();
        
        // Applications Search Amount
        let searchAppsRow = new AM.FrameBoxRow();
        let searchAppsSliderRow = new AM.FrameBoxRow();
        let searchAppsLabel = new Gtk.Label({
            label: _("Amount of Applications Search Results: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var searchAppsSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 1.0,100.0,1.0);
        searchAppsSlider.set_value(this.settings.get_int("search-apps"));
        searchAppsSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('search-apps', searchAppsSlider.get_value());
        }));
        searchAppsSlider.set_property ("expand", true);
        searchAppsRow.add(searchAppsLabel);
        searchAppsSliderRow.add(searchAppsSlider);
        searchWhereFrame.add(searchAppsRow);
        searchWhereFrame.add(searchAppsSliderRow);  
        
        
        
        // Terminal Search Amount
        let searchTerminalRow = new AM.FrameBoxRow();
        let searchTerminalSliderRow = new AM.FrameBoxRow();
        let searchTerminalLabel = new Gtk.Label({
            label: _("Amount of Terminal Search Results: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var searchTerminalSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,100.0,1.0);
        searchTerminalSlider.set_value(this.settings.get_int("search-terminal"));
        searchTerminalSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('search-terminal', searchTerminalSlider.get_value());
        }));
        searchTerminalSlider.set_property ("expand", true);
        searchTerminalRow.add(searchTerminalLabel);
        searchTerminalSliderRow.add(searchTerminalSlider);
        searchWhereFrame.add(searchTerminalRow);
        searchWhereFrame.add(searchTerminalSliderRow);
        
        
        
        
        // Recent Search Amount
        let searchRecentRow = new AM.FrameBoxRow();
        let searchRecentSliderRow = new AM.FrameBoxRow();
        let searchRecentLabel = new Gtk.Label({
            label: _("Amount of Recent Files Search Results: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var searchRecentSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,100.0,1.0);
        searchRecentSlider.set_value(this.settings.get_int("search-recent"));
        searchRecentSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('search-recent', searchRecentSlider.get_value());
        }));
        searchRecentSlider.set_property ("expand", true);
        searchRecentRow.add(searchRecentLabel);
        searchRecentSliderRow.add(searchRecentSlider);
        searchWhereFrame.add(searchRecentRow);
        searchWhereFrame.add(searchRecentSliderRow);  
        
        
        
        // Web Bookmarks Search Amount
        let searchWebmarksRow = new AM.FrameBoxRow();
        let searchWebmarksSliderRow = new AM.FrameBoxRow();
        let searchWebmarksLabel = new Gtk.Label({
            label: _("Amount of Web Bookmarks Search Results: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var searchWebmarksSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,100.0,1.0);
        searchWebmarksSlider.set_value(this.settings.get_int("search-webmarks"));
        searchWebmarksSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('search-webmarks', searchWebmarksSlider.get_value());
        }));
        searchWebmarksSlider.set_property ("expand", true);
        searchWebmarksRow.add(searchWebmarksLabel);
        searchWebmarksSliderRow.add(searchWebmarksSlider);
        searchWhereFrame.add(searchWebmarksRow);
        searchWhereFrame.add(searchWebmarksSliderRow);  
        
        // Places Search Amount
        let searchPlacesRow = new AM.FrameBoxRow();
        let searchPlacesSliderRow = new AM.FrameBoxRow();
        let searchPlacesLabel = new Gtk.Label({
            label: _("Amount of Places Search Results: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var searchPlacesSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,100.0,1.0);
        searchPlacesSlider.set_value(this.settings.get_int("search-places"));
        searchPlacesSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('search-places', searchPlacesSlider.get_value());
        }));
        searchPlacesSlider.set_property ("expand", true);
        searchPlacesRow.add(searchPlacesLabel);
        searchPlacesSliderRow.add(searchPlacesSlider);
        searchWhereFrame.add(searchPlacesRow);
        searchWhereFrame.add(searchPlacesSliderRow);
        
        this.add(searchWhereFrame);
    }	
});


const SystemButtonsPage = new Lang.Class({
	Name: 'SystemButtonsPage',
	Extends: AM.NotebookPage,
	
	_init: function(settings) {
        this.parent(_('System Buttons'));
        this.settings = settings;
		
	}
});



const LayOutPage = new Lang.Class({
	Name: 'LayoutPage',
	Extends: AM.NotebookPage,
	
	_init: function(settings) {
        this.parent(_('Layout'));
        this.settings = settings;
        
        		
		
		let layoutMenuFrame = new AM.FrameBox();
		
		let layoutMenuUnitRow = new AM.FrameBoxRow();
		let layoutMenuHeightRow = new AM.FrameBoxRow();
		let layoutMenuWidthRow = new AM.FrameBoxRow();
		let layoutAppsBoxWidthRow = new AM.FrameBoxRow();
		let layoutCategoriesBoxWidthRow = new AM.FrameBoxRow();
		let layoutPlacesBoxWidthRow = new AM.FrameBoxRow();
		
		
		
		// Drag and drop lists of layout ordering
		let layoutBoxesFrame = new AM.FrameBox();
		let layoutHorizontalBoxesRow = new AM.FrameBoxRow();
		let layoutExtraBoxesRow = new AM.FrameBoxRow();
		let layoutSearchBoxesRow = new AM.FrameBoxRow();
		
		
		
		
		
		
		
		// Menu Height
        let menuHeightLabel = new Gtk.Label({
            label: _("Set Applications, Categories and Places height"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let menuHeightEntry = new Gtk.SpinButton();
        menuHeightEntry.set_sensitive(true);
        menuHeightEntry.set_range(0, 5000); 
        menuHeightEntry.set_value(this.settings.get_int('menubox-height'));
        menuHeightEntry.set_increments(1, 2);
        menuHeightEntry.connect('value-changed', Lang.bind(this, function(entry) {
        	let _menuHeight = entry.get_value_as_int();
            this.settings.set_int('menubox-height', _menuHeight);
        }));
        layoutMenuHeightRow.add(menuHeightLabel);
        layoutMenuHeightRow.add(menuHeightEntry);
        layoutMenuFrame.add(layoutMenuHeightRow);
        
     	// Menu Width
        let menuWidthLabel = new Gtk.Label({
            label: _("Set menu width"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let menuWidthEntry = new Gtk.SpinButton();
        menuWidthEntry.set_sensitive(true);
        menuWidthEntry.set_range(0, 5000); 
        menuWidthEntry.set_value(this.settings.get_int('menu-width'));
        menuWidthEntry.set_increments(1, 2);
        menuWidthEntry.connect('value-changed', Lang.bind(this, function(entry) {
        	let _menuWidth = entry.get_value_as_int();
            this.settings.set_int('menu-width', _menuWidth);
        }));
        layoutMenuWidthRow.add(menuWidthLabel);
        layoutMenuWidthRow.add(menuWidthEntry);
        //layoutMenuFrame.add(layoutMenuWidthRow);
        
        
        
        
     	// Appsbox Width
        let appsBoxWidthLabel = new Gtk.Label({
            label: _("Set Applications Width"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let appsBoxWidthEntry = new Gtk.SpinButton();
        appsBoxWidthEntry.set_sensitive(true);
        appsBoxWidthEntry.set_range(0, 5000); 
        appsBoxWidthEntry.set_value(this.settings.get_int('appsbox-width'));
        appsBoxWidthEntry.set_increments(1, 2);
        appsBoxWidthEntry.connect('value-changed', Lang.bind(this, function(entry) {
        	let _appsBoxWidth = entry.get_value_as_int();
            this.settings.set_int('appsbox-width', _appsBoxWidth);
        }));
        layoutAppsBoxWidthRow.add(appsBoxWidthLabel);
        layoutAppsBoxWidthRow.add(appsBoxWidthEntry);
        layoutMenuFrame.add(layoutAppsBoxWidthRow);
        
        
        
        
     	// Categories Box Width
        let CategoriesBoxWidthLabel = new Gtk.Label({
            label: _("Set Categories Width"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let CategoriesBoxWidthEntry = new Gtk.SpinButton();
        CategoriesBoxWidthEntry.set_sensitive(true);
        CategoriesBoxWidthEntry.set_range(0, 5000); 
        CategoriesBoxWidthEntry.set_value(this.settings.get_int('categoriesbox-width'));
        CategoriesBoxWidthEntry.set_increments(1, 2);
        CategoriesBoxWidthEntry.connect('value-changed', Lang.bind(this, function(entry) {
        	let _CategoriesBoxWidth = entry.get_value_as_int();
            this.settings.set_int('categoriesbox-width', _CategoriesBoxWidth);
        }));
        layoutCategoriesBoxWidthRow.add(CategoriesBoxWidthLabel);
        layoutCategoriesBoxWidthRow.add(CategoriesBoxWidthEntry);
        layoutMenuFrame.add(layoutCategoriesBoxWidthRow);
        
        
        
        
        
        // Places Box Width
        let PlacesBoxWidthLabel = new Gtk.Label({
            label: _("Set Places Width"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let PlacesBoxWidthEntry = new Gtk.SpinButton();
        PlacesBoxWidthEntry.set_sensitive(true);
        PlacesBoxWidthEntry.set_range(0, 5000); 
        PlacesBoxWidthEntry.set_value(this.settings.get_int('placesbox-width'));
        PlacesBoxWidthEntry.set_increments(1, 2);
        PlacesBoxWidthEntry.connect('value-changed', Lang.bind(this, function(entry) {
        	let _PlacesBoxWidth = entry.get_value_as_int();
            this.settings.set_int('placesbox-width', _PlacesBoxWidth);
        }));
        layoutPlacesBoxWidthRow.add(PlacesBoxWidthLabel);
        layoutPlacesBoxWidthRow.add(PlacesBoxWidthEntry);
        layoutMenuFrame.add(layoutPlacesBoxWidthRow);
        
        
        
        
        this.add(layoutMenuFrame);
        
        
        // Apps view mode options
        let appsViewFrame = new AM.FrameBox();
        let appsViewModeRow = new AM.FrameBoxRow();
        let appsViewModeLabel = new Gtk.Label({
            label: _("Applications View Mode"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let appsViewModeCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        appsViewModeCombo.append_text(_("List"));
        appsViewModeCombo.append_text(_("Grid"));
        appsViewModeCombo.set_active(this.settings.get_enum('apps-viewmode'));
        appsViewModeCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('apps-viewmode', widget.get_active());
        }));
        appsViewModeRow.add(appsViewModeLabel);
        appsViewModeRow.add(appsViewModeCombo);
        appsViewFrame.add(appsViewModeRow);
        let columnCount = Array.from(new Array(22), (x,i) => i + 3);
        let appsGridColumnCountRow = new AM.FrameBoxRow();
        let appsGridColumnCountLabel = new Gtk.Label({label: _("Number of columns in Application Grid"),
                                                    hexpand:true, xalign:0});
        let appsGridColumnCountCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
            appsGridColumnCountCombo.set_size_request(120, -1);
            for (var i in columnCount) {
            	appsGridColumnCountCombo.append_text(_(columnCount[i].toString()));
            }
            appsGridColumnCountCombo.set_active(columnCount.indexOf(this.settings.get_int('apps-grid-column-count')));
            appsGridColumnCountCombo.connect('changed', Lang.bind (this, function(widget) {
                    this.settings.set_int('apps-grid-column-count', columnCount[widget.get_active()]);
            }));
        appsGridColumnCountRow.add(appsGridColumnCountLabel);
        appsGridColumnCountRow.add(appsGridColumnCountCombo);
        appsViewFrame.add(appsGridColumnCountRow);
        
        
        this.add(appsViewFrame);
        
        
        
        
        
        // Category Layout Options
        let categoriesViewFrame = new AM.FrameBox();
        
        // Category view mode options
        let categoriesViewModeRow = new AM.FrameBoxRow();
        let categoriesViewModeLabel = new Gtk.Label({
            label: _("Categories View Mode"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let categoriesViewModeCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        categoriesViewModeCombo.append_text(_("Left"));
        categoriesViewModeCombo.append_text(_("Right"));
        categoriesViewModeCombo.append_text(_("Combined"));
        //categoriesViewModeCombo.append_text(_("Accordion"))
        categoriesViewModeCombo.set_active(this.settings.get_enum('categories-viewmode'));
        categoriesViewModeCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('categories-viewmode', widget.get_active());
        }));
        categoriesViewModeRow.add(categoriesViewModeLabel);
        categoriesViewModeRow.add(categoriesViewModeCombo);
        categoriesViewFrame.add(categoriesViewModeRow);        
        this.add(categoriesViewFrame);
        
        
        
        
        let placesLocationFrame = new AM.FrameBox();
        // places location
        let placesLocationRow = new AM.FrameBoxRow();
        let placesLocationLabel = new Gtk.Label({
            label: _("Places Box Location"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let placesLocationCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        placesLocationCombo.append_text(_("Left"));
        placesLocationCombo.append_text(_("Right"));
        placesLocationCombo.append_text(_("Hide"));
        placesLocationCombo.set_active(this.settings.get_enum('places-viewmode'));
        placesLocationCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('places-viewmode', widget.get_active());
        }));
        placesLocationRow.add(placesLocationLabel);
        placesLocationRow.add(placesLocationCombo);
        placesLocationFrame.add(placesLocationRow);        
        this.add(placesLocationFrame);
        
        
	}
});


const IconsPage = new Lang.Class({
    Name: 'IconsPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Icons'));
        this.settings = settings;
        
        
        
        /* Apps Icons Settings */
        let appsIconFrame = new AM.FrameBox();
        
        // Apps Icon Size
        let appsIconRow = new AM.FrameBoxRow();
        let appsIconSliderRow = new AM.FrameBoxRow();
        let appsIconSizeLabel = new Gtk.Label({
            label: _("Size of Application Icons: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var appsIconSizeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,128.0,1.0);
        appsIconSizeSlider.set_value(this.settings.get_int("apps-icon-size"));
        appsIconSizeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('apps-icon-size', appsIconSizeSlider.get_value());
        }));
        appsIconSizeSlider.set_property ("expand", true);
        appsIconRow.add(appsIconSizeLabel);
        appsIconSliderRow.add(appsIconSizeSlider);
        appsIconFrame.add(appsIconRow);
        appsIconFrame.add(appsIconSliderRow);
        
        
        
        // Apps Label location
        let appsLabelRow = new AM.FrameBoxRow();
        let appsLabelLabel = new Gtk.Label({
            label: _("Application Label location: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let appsLabelCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        appsLabelCombo.append_text(_("Left"));
        appsLabelCombo.append_text(_("Right"));
        appsLabelCombo.append_text(_("Hide"));
        appsLabelCombo.set_active(this.settings.get_enum('apps-label'));
        appsLabelCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('apps-label', widget.get_active());
        }));
        appsLabelRow.add(appsLabelLabel);
        appsLabelRow.add(appsLabelCombo);
        appsIconFrame.add(appsLabelRow);        
        
        
        // Apps Button Orientation
        let appsOrientationRow = new AM.FrameBoxRow();
        let appsOrientationLabel = new Gtk.Label({
            label: _("Application button orientation: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let appsOrientationCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        appsOrientationCombo.append_text(_("Left"));
        appsOrientationCombo.append_text(_("Right"));
        appsOrientationCombo.append_text(_("Middle"));
        appsOrientationCombo.set_active(this.settings.get_enum('apps-button-orientation'));
        appsOrientationCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('apps-button-orientation', widget.get_active());
        }));
        appsOrientationRow.add(appsOrientationLabel);
        appsOrientationRow.add(appsOrientationCombo);
        appsIconFrame.add(appsOrientationRow);        
        this.add(appsIconFrame);
        
        
        
        
        
        
        /* Categories Icon Settings*/
        let categoryIconFrame = new AM.FrameBox();
        
        // Categories Icon Size
        let categoryIconRow = new AM.FrameBoxRow();
        let categoryIconSliderRow = new AM.FrameBoxRow();
        let categoriesIconSizeLabel = new Gtk.Label({
            label: _("Size of Category Icons: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        //let iconSizes = [0, 16, 22, 24, 32, 48, 64, 96, 128];
        var categoriesIconSizeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,128.0,1.0);
        categoriesIconSizeSlider.set_value(this.settings.get_int("categories-icon-size"));
        categoriesIconSizeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('categories-icon-size', categoriesIconSizeSlider.get_value());
        }));
        categoriesIconSizeSlider.set_property ("expand", true);
        categoryIconRow.add(categoriesIconSizeLabel);
        categoryIconSliderRow.add(categoriesIconSizeSlider);
        categoryIconFrame.add(categoryIconRow);
        categoryIconFrame.add(categoryIconSliderRow);
        
        
        // Category Icon location
        let categoryLabelRow = new AM.FrameBoxRow();
        let categoriesLabelLabel = new Gtk.Label({
            label: _("Category Label location: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let categoriesLabelCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        categoriesLabelCombo.append_text(_("Left"));
        categoriesLabelCombo.append_text(_("Right"));
        categoriesLabelCombo.append_text(_("Hide"));
        categoriesLabelCombo.set_active(this.settings.get_enum('categories-label'));
        categoriesLabelCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('categories-label', widget.get_active());
        }));
        categoryLabelRow.add(categoriesLabelLabel);
        categoryLabelRow.add(categoriesLabelCombo);
        categoryIconFrame.add(categoryLabelRow);        
        
        
        
        // Categories Button Orientation
        let categoriesOrientationRow = new AM.FrameBoxRow();
        let categoriesOrientationLabel = new Gtk.Label({
            label: _("Category button orientation: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let categoriesOrientationCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        categoriesOrientationCombo.append_text(_("Left"));
        categoriesOrientationCombo.append_text(_("Right"));
        categoriesOrientationCombo.append_text(_("Middle"));
        categoriesOrientationCombo.set_active(this.settings.get_enum('categories-button-orientation'));
        categoriesOrientationCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('categories-button-orientation', widget.get_active());
        }));
        categoriesOrientationRow.add(categoriesOrientationLabel);
        categoriesOrientationRow.add(categoriesOrientationCombo);
        categoryIconFrame.add(categoriesOrientationRow);        
        this.add(categoryIconFrame);
        
        
        
        
        /* Places Icons Settings */
        let placesIconFrame = new AM.FrameBox();
        
        // Apps Icon Size
        let placesIconRow = new AM.FrameBoxRow();
        let placesIconSliderRow = new AM.FrameBoxRow();
        let placesIconSizeLabel = new Gtk.Label({
            label: _("Size of Place Icons: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var placesIconSizeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,128.0,1.0);
        placesIconSizeSlider.set_value(this.settings.get_int("places-icon-size"));
        placesIconSizeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('places-icon-size', placesIconSizeSlider.get_value());
        }));
        placesIconSizeSlider.set_property ("expand", true);
        placesIconRow.add(placesIconSizeLabel);
        placesIconSliderRow.add(placesIconSizeSlider);
        placesIconFrame.add(placesIconRow);
        placesIconFrame.add(placesIconSliderRow);
        
        
        
        // Places Label location
        let placesLabelRow = new AM.FrameBoxRow();
        let placesLabelLabel = new Gtk.Label({
            label: _("Places Label location: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let placesLabelCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        placesLabelCombo.append_text(_("Left"));
        placesLabelCombo.append_text(_("Right"));
        placesLabelCombo.append_text(_("Hide"));
        placesLabelCombo.set_active(this.settings.get_enum('places-label'));
        placesLabelCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('places-label', widget.get_active());
        }));
        placesLabelRow.add(placesLabelLabel);
        placesLabelRow.add(placesLabelCombo);
        placesIconFrame.add(placesLabelRow);        
        this.add(placesIconFrame);
        
        
        // Places Button Orientation
        let placesOrientationRow = new AM.FrameBoxRow();
        let placesOrientationLabel = new Gtk.Label({
            label: _("Places button orientation: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let placesOrientationCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        placesOrientationCombo.append_text(_("Left"));
        placesOrientationCombo.append_text(_("Right"));
        placesOrientationCombo.append_text(_("Middle"));
        placesOrientationCombo.set_active(this.settings.get_enum('places-button-orientation'));
        placesOrientationCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('places-button-orientation', widget.get_active());
        }));
        placesOrientationRow.add(placesOrientationLabel);
        placesOrientationRow.add(placesOrientationCombo);
        placesIconFrame.add(placesOrientationRow);        
        this.add(placesIconFrame);
        
        
        
        
        
        /* User Icons Settings */
        let userIconFrame = new AM.FrameBox();
        
        // User Icon Size
        let userIconRow = new AM.FrameBoxRow();
        let userIconSliderRow = new AM.FrameBoxRow();
        let userIconSizeLabel = new Gtk.Label({
            label: _("Size of User Icon: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var userIconSizeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,128.0,1.0);
        userIconSizeSlider.set_value(this.settings.get_int("user-icon-size"));
        userIconSizeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('user-icon-size', userIconSizeSlider.get_value());
        }));
        userIconSizeSlider.set_property ("expand", true);
        userIconRow.add(userIconSizeLabel);
        userIconSliderRow.add(userIconSizeSlider);
        userIconFrame.add(userIconRow);
        userIconFrame.add(userIconSliderRow);
        
        
        
        // User Label location
        let userLabelRow = new AM.FrameBoxRow();
        let userLabelLabel = new Gtk.Label({
            label: _("User Label location: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let userLabelCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        userLabelCombo.append_text(_("Left"));
        userLabelCombo.append_text(_("Right"));
        userLabelCombo.append_text(_("Hide"));
        userLabelCombo.set_active(this.settings.get_enum('user-label'));
        userLabelCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('user-label', widget.get_active());
        }));
        userLabelRow.add(userLabelLabel);
        userLabelRow.add(userLabelCombo);
        userIconFrame.add(userLabelRow);        
        this.add(userIconFrame);
        
        
        // Places Button Orientation
        let userOrientationRow = new AM.FrameBoxRow();
        let userOrientationLabel = new Gtk.Label({
            label: _("User button orientation: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let userOrientationCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        userOrientationCombo.append_text(_("Left"));
        userOrientationCombo.append_text(_("Right"));
        userOrientationCombo.append_text(_("Middle"));
        userOrientationCombo.set_active(this.settings.get_enum('user-button-orientation'));
        userOrientationCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('user-button-orientation', widget.get_active());
        }));
        userOrientationRow.add(userOrientationLabel);
        userOrientationRow.add(userOrientationCombo);
        userIconFrame.add(userOrientationRow);        
        this.add(userIconFrame);
        
        
        
        
        
        
        
        /* Grid Icons Settings */
        let gridIconFrame = new AM.FrameBox();
        
        // Grid Icon Size
        let gridIconRow = new AM.FrameBoxRow();
        let gridIconSliderRow = new AM.FrameBoxRow();
        let gridIconSizeLabel = new Gtk.Label({
            label: _("Size of Grid Icons: "),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        var gridIconSizeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 32.0,128.0,1.0);
        gridIconSizeSlider.set_value(this.settings.get_int("grid-icon-size"));
        gridIconSizeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('grid-icon-size', gridIconSizeSlider.get_value());
        }));
        gridIconSizeSlider.set_property ("expand", true);
        gridIconRow.add(gridIconSizeLabel);
        gridIconSliderRow.add(gridIconSizeSlider);
        gridIconFrame.add(gridIconRow);
        gridIconFrame.add(gridIconSliderRow);
        this.add(gridIconFrame);
	}
});

























// Initialize menu language translations
function init() {
    //convenience.initTranslations();
}

function buildPrefsWidget() {
    let widget = new MenyyPreferencesWidget();
    widget.show_all();
    return widget;
}
