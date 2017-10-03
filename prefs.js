/*
 *  Menüü settings
 */






/*
 * Arc Menu: The new applications menu for Gnome 3.
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
 * Arc Menu Preferences Widget
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
        
        
        let panelButtonPage = new PanelButtonPage(this.settings);
        notebook.append_page(panelButtonPage, panelButtonPage.title);
        
        let categoriesPage = new CategoriesPage(this.settings);
        notebook.append_page(categoriesPage, categoriesPage.title);
        
        let appsPage = new AppsPage(this.settings);
        notebook.append_page(appsPage, appsPage.title);
        
        let placesPage = new PlacesPage(this.settings);
        notebook.append_page(placesPage, placesPage.title);
        
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
        let logoPath = Menyy.path + constants.ARC_MENU_LOGO.Path;
        let [imageWidth, imageHeight] = constants.ARC_MENU_LOGO.Size;
        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, imageWidth, imageHeight);
        let arcMenuImage = new Gtk.Image({ pixbuf: pixbuf });
        let arcMenuImageBox = new Gtk.VBox({
            margin_top:5,
            margin_bottom: 5,
            expand: false
        });
        arcMenuImageBox.add(arcMenuImage);

        // Create the info box
        let arcMenuInfoBox = new Gtk.VBox({
            margin_top:5,
            margin_bottom: 5,
            expand: false
        });
        let arcMenuLabel = new Gtk.Label({
            label: '<b>' + _('Arc-Menu') + '</b>',
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
        arcMenuInfoBox.add(arcMenuLabel);
        arcMenuInfoBox.add(versionLabel);
        arcMenuInfoBox.add(projectDescriptionLabel);
        arcMenuInfoBox.add(projectLinkButton);

        // Create the GNU software box
        let gnuSofwareLabel = new Gtk.Label({
            label: constants.GNU_SOFTWARE,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            expand: true
        });
        let gnuSofwareLabelBox = new Gtk.VBox({});
        gnuSofwareLabelBox.pack_end(gnuSofwareLabel,false, false, 0);

        this.add(arcMenuImageBox);
        this.add(arcMenuInfoBox);
        this.add(gnuSofwareLabel);
    }
});


const CategoriesPage = new Lang.Class({
    Name: 'CategoriesPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Categories'));
        this.settings = settings;
        
        
        
        let categoryIconFrame = new AM.FrameBox();
        
        // Category Icon size options
        let categoryIconRow = new AM.FrameBoxRow();
        let categoriesIconSizeLabel = new Gtk.Label({
            label: _("Size of Category Icons"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let iconSizes = [0, 16, 22, 24, 32, 48, 64, 96, 128];
        let categoriesIconSizeCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        	categoriesIconSizeCombo.set_size_request(129, -1);
        	categoriesIconSizeCombo.append_text('0');
        	categoriesIconSizeCombo.append_text('16');
        	categoriesIconSizeCombo.append_text('22');
        	categoriesIconSizeCombo.append_text('24');
        	categoriesIconSizeCombo.append_text('32');
            categoriesIconSizeCombo.append_text('48');
            categoriesIconSizeCombo.append_text('64');
            categoriesIconSizeCombo.append_text('96');
            categoriesIconSizeCombo.append_text('128');
            categoriesIconSizeCombo.set_active(iconSizes.indexOf(this.settings.get_int('categories-icon-size')));
            categoriesIconSizeCombo.connect('changed', Lang.bind (this, function(widget) {
                    this.settings.set_int('categories-icon-size', iconSizes[widget.get_active()]);
            }));
        categoryIconRow.add(categoriesIconSizeLabel);
        categoryIconRow.add(categoriesIconSizeCombo);
        categoryIconFrame.add(categoryIconRow);
        
        
        
        
        
        // Category Label location
        let categoryLabelRow = new AM.FrameBoxRow();
        let categoriesLabelLabel = new Gtk.Label({
            label: _("Category Label location"),
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
        this.add(categoryIconFrame);
        
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
        categoriesViewModeCombo.append_text(_("Accordion"))
        categoriesViewModeCombo.set_active(this.settings.get_enum('categories-viewmode'));
        categoriesViewModeCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('categories-viewmode', widget.get_active());
        }));
        categoriesViewModeRow.add(categoriesViewModeLabel);
        categoriesViewModeRow.add(categoriesViewModeCombo);
        categoriesViewFrame.add(categoriesViewModeRow);
        
        
        
        // Category size options
        let categoriesBoxSizeRow = new AM.FrameBoxRow();
        let categoriesBoxSizeLabel = new Gtk.Label({
            label: _("Categories Pane size in percent"),
            use_markup: true,
            xalign: 0,
            hexpand: false
        });
        categoriesBoxSizeRow.add(categoriesBoxSizeLabel);
        var categoriesBoxSizeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,100.0,1.0);
        categoriesBoxSizeSlider.set_value(this.settings.get_int("categories-size"));
        categoriesBoxSizeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('categories-size', categoriesBoxSizeSlider.get_value());
        }));
        categoriesBoxSizeSlider.set_property ("expand", true);
        categoriesBoxSizeRow.add(categoriesBoxSizeSlider);
        categoriesViewFrame.add(categoriesBoxSizeRow);
        
        this.add(categoriesViewFrame);
        
        
        
        // Categories Behaviour frame
        let categoriesBehaveFrame = new AM.FrameBox();
        
        
        let categoriesSelectMethodBox = new AM.FrameBoxRow();
        let categoriesSelectMethodLabel = new Gtk.Label({
	        label: _("Categories Selection Method"),
	        use_markup: true,
	        xalign: 0,
	        hexpand: true
        });
        let categoriesSelectMethodCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
            categoriesSelectMethodCombo.append_text(_('Hover'));
            categoriesSelectMethodCombo.append_text(_('Click'));
            categoriesSelectMethodCombo.set_active(this.settings.get_enum('categories-selection-method'));
            categoriesSelectMethodCombo.connect('changed', Lang.bind (this, function(widget) {
                    this.settings.set_enum('categories-selection-method', widget.get_active());
            }));

        categoriesSelectMethodBox.add(categoriesSelectMethodLabel);
        categoriesSelectMethodBox.add(categoriesSelectMethodCombo);
        categoriesBehaveFrame.add(categoriesSelectMethodBox);
        
        
        
        let categoriesHoverRow = new AM.FrameBoxRow();
        let categoriesHoverLabel = new Gtk.Label({
            label: _("Categories Hover Open Time"),
            use_markup: true,
            xalign: 0,
            hexpand: false
        });    
        categoriesHoverRow.add(categoriesHoverLabel);
        var categoriesHoverSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,500.0,1.0);
        categoriesHoverSlider.set_value(this.settings.get_int("categories-hover-delay"));
        categoriesHoverSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('categories-hover-delay', categoriesHoverSlider.get_value());
        }));
        categoriesHoverSlider.set_property ("expand", true);
        categoriesHoverRow.add(categoriesHoverSlider);
        categoriesBehaveFrame.add(categoriesHoverRow);
        
        
        
        let categoriesCollapseRow = new AM.FrameBoxRow();
        let categoriesCollapseLabel = new Gtk.Label({
            label: _("Categories Collapsible"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        categoriesCollapseRow.add(categoriesCollapseLabel);
        let categoriesCollapseCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        categoriesCollapseCombo.append_text(_('True'));
        categoriesCollapseCombo.append_text(_('False'));
        categoriesCollapseCombo.set_active(this.settings.get_enum('categories-collapsible'));
        categoriesCollapseCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('categories-collapsible', widget.get_active());
        }));

        categoriesCollapseRow.add(categoriesCollapseCombo);
        categoriesBehaveFrame.add(categoriesCollapseRow);
        
        
        let categoriesCollapseTimeRow = new AM.FrameBoxRow();
        let categoriesCollapseTimeLabel = new Gtk.Label({
            label: _("Categories Expand Hover Time"),
            use_markup: true,
            xalign: 0,
            hexpand: false
        });
        categoriesCollapseTimeRow.add(categoriesCollapseTimeLabel);
        var categoriesCollapseTimeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,500.0,1.0);
        categoriesCollapseTimeSlider.set_value(this.settings.get_int("categories-collapse-time"));
        categoriesCollapseTimeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('categories-collapse-time', categoriesCollapseTimeSlider.get_value());
        }));
        categoriesCollapseTimeSlider.set_property ("expand", true);
        categoriesCollapseTimeRow.add(categoriesCollapseTimeSlider);
        categoriesBehaveFrame.add(categoriesCollapseTimeRow);
        
        
        this.add(categoriesBehaveFrame);
    }
});

const AppsPage = new Lang.Class({
    Name: 'ApplicationsPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Applications'));
        this.settings = settings;
        
        
        
        
        let appsIconFrame = new AM.FrameBox();
        
        // Category Icon size options
        let appsIconRow = new AM.FrameBoxRow();
        let appsIconSizeLabel = new Gtk.Label({
            label: _("Size of Application Icons"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let iconSizes = [0, 16, 22, 24, 32, 48, 64, 96, 128];
        let appsIconSizeCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        	appsIconSizeCombo.set_size_request(129, -1);
        	appsIconSizeCombo.append_text('0');
        	appsIconSizeCombo.append_text('16');
        	appsIconSizeCombo.append_text('22');
        	appsIconSizeCombo.append_text('24');
        	appsIconSizeCombo.append_text('32');
            appsIconSizeCombo.append_text('48');
            appsIconSizeCombo.append_text('64');
            appsIconSizeCombo.append_text('96');
            appsIconSizeCombo.append_text('128');
            appsIconSizeCombo.set_active(iconSizes.indexOf(this.settings.get_int('apps-icon-size')));
            appsIconSizeCombo.connect('changed', Lang.bind (this, function(widget) {
                    this.settings.set_int('apps-icon-size', iconSizes[widget.get_active()]);
            }));
        appsIconRow.add(appsIconSizeLabel);
        appsIconRow.add(appsIconSizeCombo);
        appsIconFrame.add(appsIconRow);
        
        
        
        
        // Apps Label location
        let appsLabelRow = new AM.FrameBoxRow();
        let appsLabelLabel = new Gtk.Label({
            label: _("Application Label location"),
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
        this.add(appsIconFrame);
        
        
        

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
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
        //appsViewModeCombo.append_text(_("SmartList"));	// Live tiles & daemon buttons etc
        //appsViewModeCombo.append_text(_("SmartGrid"));	//
        appsViewModeCombo.set_active(this.settings.get_enum('apps-viewmode'));
        appsViewModeCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('apps-viewmode', widget.get_active());
        }));
        appsViewModeRow.add(appsViewModeLabel);
        appsViewModeRow.add(appsViewModeCombo);
        appsViewFrame.add(appsViewModeRow);
        
        
        
        
        
        let columnCount = [3, 4, 5 , 6, 7];
        let appsGridColumnCountRow = new AM.FrameBoxRow();
        let appsGridColumnCountLabel = new Gtk.Label({label: _("Number of columns in Application Grid"),
                                                    hexpand:true, xalign:0});
        let appsGridColumnCountCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
            appsGridColumnCountCombo.set_size_request(120, -1);
            appsGridColumnCountCombo.append_text(_('3'));
            appsGridColumnCountCombo.append_text(_('4'));
            appsGridColumnCountCombo.append_text(_('5'));
            appsGridColumnCountCombo.append_text(_('6'));
            appsGridColumnCountCombo.append_text(_('7'));
            appsGridColumnCountCombo.set_active(columnCount.indexOf(this.settings.get_int('apps-grid-column-count')));
            appsGridColumnCountCombo.connect('changed', Lang.bind (this, function(widget) {
                    this.settings.set_int('apps-grid-column-count', columnCount[widget.get_active()]);
            }));


        appsGridColumnCountRow.add(appsGridColumnCountLabel);
        appsGridColumnCountRow.add(appsGridColumnCountCombo);
        appsViewFrame.add(appsGridColumnCountRow);
        
        
        
        // Apps + Categories size options
        let appsBoxSizeRow = new AM.FrameBoxRow();
        let appsBoxSizeLabel = new Gtk.Label({
            label: _("Application + Categories Pane size in percent"),
            use_markup: true,
            xalign: 0,
            hexpand: false
        });
        appsBoxSizeRow.add(appsBoxSizeLabel);
        var appsBoxSizeSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0,100.0,1.0);
        appsBoxSizeSlider.set_value(this.settings.get_int("apps-size"));
        appsBoxSizeSlider.connect('value-changed', Lang.bind (this, function(widget) {
            this.settings.set_int('apps-size', appsBoxSizeSlider.get_value());
        }));
        appsBoxSizeSlider.set_property ("expand", true);
        appsBoxSizeRow.add(appsBoxSizeSlider);
        appsViewFrame.add(appsBoxSizeRow);
        
        this.add(appsViewFrame);
        
        
    }
});


const PlacesPage = new Lang.Class({
    Name: 'PlacesPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Places'));
        this.settings = settings;
        
        
        let placesIconFrame = new AM.FrameBox();
        
        // Places Icon size options
        let placesIconRow = new AM.FrameBoxRow();
        let placesIconSizeLabel = new Gtk.Label({
            label: _("Size of Place Icons"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });        
        let iconSizes = [0, 16, 22, 24, 32, 48, 64, 96, 128];
        let placesIconSizeCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        	placesIconSizeCombo.set_size_request(129, -1);
        	placesIconSizeCombo.append_text('0');
        	placesIconSizeCombo.append_text('16');
        	placesIconSizeCombo.append_text('22');
        	placesIconSizeCombo.append_text('24');
        	placesIconSizeCombo.append_text('32');
            placesIconSizeCombo.append_text('48');
            placesIconSizeCombo.append_text('64');
            placesIconSizeCombo.append_text('96');
            placesIconSizeCombo.append_text('128');
            placesIconSizeCombo.set_active(iconSizes.indexOf(this.settings.get_int('places-icon-size')));
            placesIconSizeCombo.connect('changed', Lang.bind (this, function(widget) {
                    this.settings.set_int('places-icon-size', iconSizes[widget.get_active()]);
            }));
        placesIconRow.add(placesIconSizeLabel);
        placesIconRow.add(placesIconSizeCombo);
        placesIconFrame.add(placesIconRow);
        
        
        
        
        // Places Label location
        let placesLabelRow = new AM.FrameBoxRow();
        let placesLabelLabel = new Gtk.Label({
            label: _("Places Label location"),
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
        placesLocationCombo.set_active(this.settings.get_enum('places-location'));
        placesLocationCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('places-location', widget.get_active());
        }));
        placesLocationRow.add(placesLocationLabel);
        placesLocationRow.add(placesLocationCombo);
        placesLocationFrame.add(placesLocationRow);        
        this.add(placesLocationFrame);
        
        
        // Make moveable list with all the things that places can show!
        
        
        
    }
});


const SearchPage = new Lang.Class({
    Name: 'SearchPage',
    Extends: AM.NotebookPage,

    _init: function(settings) {
        this.parent(_('Search'));
        this.settings = settings;
        
        
        let searchWhereFrame = new AM.FrameBox();
        let boolean = [0, 1];
        
        
        // Where to search (rows)
        let searchPlacesRow = new AM.FrameBoxRow();
        let searchFilesRow = new AM.FrameBoxRow();
        let searchTerminalRow = new AM.FrameBoxRow();
        let searchRecentRow = new AM.FrameBoxRow();
        let searchCalculatorRow = new AM.FrameBoxRow();
        let searchWebMarksRow = new AM.FrameBoxRow();
        let searchWikiRow = new AM.FrameBoxRow();
        let searchGoogleRow = new AM.FrameBoxRow();
        
        
        
        
        
        
        let searchPlacesLabel = new Gtk.Label({
            label: _("Search Places"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchPlacesRow.add(searchPlacesLabel);
        let searchPlacesCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchPlacesCombo.append_text(_('False'));
        searchPlacesCombo.append_text(_('True'));
        searchPlacesCombo.set_active(this.settings.get_int('search-places'));
        searchPlacesCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-places', boolean[widget.get_active()]);
        }));

        searchPlacesRow.add(searchPlacesCombo);
        searchWhereFrame.add(searchPlacesRow);
        
        
        
        
        
        
        let searchFilesLabel = new Gtk.Label({
            label: _("Search Files"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchFilesRow.add(searchFilesLabel);
        let searchFilesCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchFilesCombo.append_text(_('False'));
        searchFilesCombo.append_text(_('True'));
        searchFilesCombo.set_active(this.settings.get_int('search-files'));
        searchFilesCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-files', boolean[widget.get_active()]);
        }));

        searchFilesRow.add(searchFilesCombo);
        searchWhereFrame.add(searchFilesRow);
        
        
        
        
        
        let searchTerminalLabel = new Gtk.Label({
            label: _("Search Terminal"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchTerminalRow.add(searchTerminalLabel);
        let searchTerminalCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchTerminalCombo.append_text(_('False'));
        searchTerminalCombo.append_text(_('True'));
        searchTerminalCombo.set_active(this.settings.get_int('search-terminal'));
        searchTerminalCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-terminal', boolean[widget.get_active()]);
        }));

        searchTerminalRow.add(searchTerminalCombo);
        searchWhereFrame.add(searchTerminalRow);
        
        
        
        
        
        let searchRecentLabel = new Gtk.Label({
            label: _("Search Recent"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchRecentRow.add(searchRecentLabel);
        let searchRecentCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchRecentCombo.append_text(_('False'));
        searchRecentCombo.append_text(_('True'));
        searchRecentCombo.set_active(this.settings.get_int('search-recent'));
        searchRecentCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-recent', boolean[widget.get_active()]);
        }));

        searchRecentRow.add(searchRecentCombo);
        searchWhereFrame.add(searchRecentRow);
        
        
        
        
        
        let searchCalculatorLabel = new Gtk.Label({
            label: _("Search Calculator"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchCalculatorRow.add(searchCalculatorLabel);
        let searchCalculatorCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchCalculatorCombo.append_text(_('False'));
        searchCalculatorCombo.append_text(_('True'));
        searchCalculatorCombo.set_active(this.settings.get_int('search-calculator'));
        searchCalculatorCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-calculator', boolean[widget.get_active()]);
        }));

        searchCalculatorRow.add(searchCalculatorCombo);
        searchWhereFrame.add(searchCalculatorRow);
        
        
        
        
        
        let searchWebMarksLabel = new Gtk.Label({
            label: _("Search WebMarks"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchWebMarksRow.add(searchWebMarksLabel);
        let searchWebMarksCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchWebMarksCombo.append_text(_('False'));
        searchWebMarksCombo.append_text(_('True'));
        searchWebMarksCombo.set_active(this.settings.get_int('search-webmarks'));
        searchWebMarksCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-webmarks', boolean[widget.get_active()]);
        }));

        searchWebMarksRow.add(searchWebMarksCombo);
        searchWhereFrame.add(searchWebMarksRow);
        
        
        
        
        
        let searchWikiLabel = new Gtk.Label({
            label: _("Search Wiki"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchWikiRow.add(searchWikiLabel);
        let searchWikiCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchWikiCombo.append_text(_('False'));
        searchWikiCombo.append_text(_('True'));
        searchWikiCombo.set_active(this.settings.get_int('search-wiki'));
        searchWikiCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-wiki', boolean[widget.get_active()]);
        }));

        searchWikiRow.add(searchWikiCombo);
        searchWhereFrame.add(searchWikiRow);
        
        
        
        
        
        let searchGoogleLabel = new Gtk.Label({
            label: _("Search Google"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchGoogleRow.add(searchGoogleLabel);
        let searchGoogleCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchGoogleCombo.append_text(_('False'));
        searchGoogleCombo.append_text(_('True'));
        searchGoogleCombo.set_active(this.settings.get_int('search-google'));
        searchGoogleCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-google', boolean[widget.get_active()]);
        }));

        searchGoogleRow.add(searchGoogleCombo);
        searchWhereFrame.add(searchGoogleRow);
        
        this.add(searchWhereFrame);
        
        
        
        
        
        
        
        
        
        
        
        
        // Location settings
        let searchLocationFrame = new AM.FrameBox();
        let searchHorizontalRow = new AM.FrameBoxRow();
        let searchVerticalRow = new AM.FrameBoxRow();
        let searchModeRow = new AM.FrameBoxRow();
        
        
        let searchHorizontalLabel = new Gtk.Label({
            label: _("Searchbar Horizontal Location"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchHorizontalRow.add(searchHorizontalLabel);
        let searchHorizontalCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchHorizontalCombo.append_text(_('Top'));
        searchHorizontalCombo.append_text(_('Bottom'));
        searchHorizontalCombo.set_active(this.settings.get_int('search-horizontal'));
        searchHorizontalCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-horizontal', boolean[widget.get_active()]);
        }));

        searchHorizontalRow.add(searchHorizontalCombo);
        searchLocationFrame.add(searchHorizontalRow);
        
        
        
        
        let searchVerticalLabel = new Gtk.Label({
            label: _("Searchbar Vertical Location"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchVerticalRow.add(searchVerticalLabel);
        let searchVerticalCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchVerticalCombo.append_text(_('Left'));
        searchVerticalCombo.append_text(_('Right'));
        searchVerticalCombo.set_active(this.settings.get_int('search-vertical'));
        searchVerticalCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_int('search-vertical', boolean[widget.get_active()]);
        }));

        searchVerticalRow.add(searchVerticalCombo);
        searchLocationFrame.add(searchVerticalRow);
        
        
        
        
        let searchModeLabel = new Gtk.Label({
            label: _("Searchbar Mode"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });    
        searchModeRow.add(searchModeLabel);
        let searchModeCombo = new Gtk.ComboBoxText({halign:Gtk.Align.END});
        searchModeCombo.append_text(_('Show'));
        searchModeCombo.append_text(_('Smart'));
        searchModeCombo.append_text(_('Hide'));
        searchModeCombo.set_active(this.settings.get_enum('search-mode'));
        searchModeCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('search-mode', widget.get_active());
        }));

        searchModeRow.add(searchModeCombo);
        searchLocationFrame.add(searchModeRow);
        
        
        
        
        this.add(searchLocationFrame);
        
        
        
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
		let layoutMenuUnitRow = new AM.FrameBox();
		let layoutMenuHeightRow = new AM.FrameBoxRow();
		let layoutMenuWidthRow = new AM.FrameBoxRow();
		let layoutAppsBoxWidthRow = new AM.FrameBoxRow();
		let layoutCategoriesBoxWidthRow = new AM.FrameBoxRow();
		let layoutPlacesBoxWidthRow = new AM.FrameBoxRow();
		
		
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
