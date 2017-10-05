const Lang = imports.lang;
const St = imports.gi.St;
const LoginManager = imports.misc.loginManager;		// LogoutButton, SuspendButton
const Main = imports.ui.main;				// LockButton

//TODO(See if it's reasonable to create a parent class with extends classes where the only difference would be the activate function, icon name and accessible-name)

const PowerButton = new Lang.Class({
    Name: 'Menyy.PowerButton',
    // Initialize the menu item
    _init: function(menyy) {
   	    this.parent();   	
    	let style = "system-menu-action";
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Power Off"),
            style_class: style
        });
        this.actor.child = new St.Icon({ icon_name: 'system-shutdown-symbolic' });
        this.actor._delegate = this;
        this._button = menyy;
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },
    
    // Activate the button (Shutdown)
    _onClick: function() {
    	this.activate();
    },
    // Access this from the outside
    activate: function() {
        this._button.menu.toggle();
        this._button._session.ShutdownRemote(0);
    },
});

//Shell Button
const ShellButton = new Lang.Class({
    Name: 'ShellButton',
    // Initialize the menu item
    _init: function(menyy) {
   	    this.parent();   	
    	let style = "system-menu-action";
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Restart Gnome Shell"),
            style_class: style
        });
        this.actor.child = new St.Icon({ icon_name: 'system-refresh-symbolic' });
        this.actor._delegate = this;
        this._button = menyy;
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },
    
    // Activate the button (restart shell)
    _onClick: function() {
    	this.activate();
    },
    // Access this from the outside
    activate: function() {
        this._button.menu.toggle();
        global.reexec_self();
    },
});


//Logout Button
const LogoutButton = new Lang.Class({
    Name: 'LogoutButton',
    // Initialize the menu item
    _init: function(menyy) {
   	    this.parent();   	
    	let style = "system-menu-action";
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Log Out"),
            style_class: style
        });
        this.actor.child = new St.Icon({ icon_name: 'application-exit-symbolic' });
        this.actor._delegate = this;
        this._button = menyy;
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },
    
    activate: function() {
    	this._button.menu.toggle();
    	this._button._session.LogoutRemote(0);
    },
    
    // Activate the button (Logout)
    _onClick: function() {
    	this.activate();
    }
});

// Suspend Button
const SuspendButton = new Lang.Class({
    Name: 'SuspendButton',
    // Initialize the menu item
    _init: function(menyy) {
   	    this.parent();   	
    	let style = "system-menu-action";
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Suspend"),
            style_class: style
        });
        this.actor.child = new St.Icon({ icon_name: 'media-playback-pause-symbolic' });
        this.actor._delegate = this;
        this._button = menyy;
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Suspend the system)    
    activate: function() {
    	 this._button.menu.toggle();
         let loginManager = LoginManager.getLoginManager();
             loginManager.canSuspend(Lang.bind(this,
                 function(result) {
                     if (result) {
                         loginManager.suspend();
                     }
             }));
    },
    _onClick: function() {
    	this.activate();
    }
});

// Lock Screen Button
const LockButton = new Lang.Class({
    Name: 'LockButton',
    // Initialize the menu item
    _init: function(menyy) {
   	    this.parent();   	
    	let style = "system-menu-action";
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Lock"),
            style_class: style
        });
        this.actor.child = new St.Icon({ icon_name: 'changes-prevent-symbolic' });
        //Icons: user-lock-symbolic
        this.actor._delegate = this;
        this._button = menyy;
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Lock the screen)
    activate: function() {
        this._button.menu.toggle();
        if (Main.screenShield !== null) {
        	Main.screenShield.lock(true);
        }
    },
    _onClick: function(){
    	this.activate();
    }
});