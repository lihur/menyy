const Lang = imports.lang;
const St = imports.gi.St;
const LoginManager = imports.misc.loginManager;		// LogoutButton, SuspendButton
const Main = imports.ui.main;				// LockButton


//Power Button
const PowerButton = new Lang.Class({
    Name: 'PowerButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Power Off"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'system-shutdown-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Shutdown)
    _onClick: function() {
        this._button.menu.toggle();
        this._button._session.ShutdownRemote(0);
    }
});


//Shell Button
const ShellButton = new Lang.Class({
    Name: 'ShellButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Restart Gnome Shell"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'system-refresh-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Shutdown)
    _onClick: function() {
        this._button.menu.toggle();
        global.reexec_self();
    }
});


//Logout Button
const LogoutButton = new Lang.Class({
    Name: 'LogoutButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Log Out"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'application-exit-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Logout)
    _onClick: function() {
        this._button.menu.toggle();
        this._button._session.LogoutRemote(0);
    }
});

// Suspend Button
const SuspendButton = new Lang.Class({
    Name: 'SuspendButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Suspend"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'media-playback-pause-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Suspend the system)
    _onClick: function() {
        this._button.menu.toggle();
        let loginManager = LoginManager.getLoginManager();
            loginManager.canSuspend(Lang.bind(this,
                function(result) {
                    if (result) {
                        loginManager.suspend();
                    }
            }));
    }
});

// Lock Screen Button
const LockButton = new Lang.Class({
    Name: 'LockButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Lock"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'changes-prevent-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Lock the screen)
    _onClick: function() {
        this._button.menu.toggle();
        if (Main.screenShield !== null) {
        	Main.screenShield.lock(true);
        } else {
        	global.log("menyy: no screen shield!")
        }
    }
});




