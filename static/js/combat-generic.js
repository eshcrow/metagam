var gt = parent.gt;
var Game = parent.Game;
var sprintf = parent.sprintf;

var GenericCombat = Ext.extend(Combat, {
    constructor: function (combatId) {
        var self = this;
        GenericCombat.superclass.constructor.call(self, combatId);
        self.createMain();
    },

    /*
     * Initialize interface constants
     */
    initConstants: function () {
        var self = this;
        GenericCombat.superclass.initConstants.call(self);
        self.logHeight = 50;
        self.aboveAvatarParams = [];
        self.belowAvatarParams = [];
        self.goButtonText = 'Go';
        self.avatarWidth = 120;
        self.avatarHeight = 220;
    },

    /*
     * Create containter for player's avatar
     */
    createMyAvatar: function () {
        var self = this;
        self.myAvatarComponent = new Ext.BoxComponent({
            id: 'combat-myavatar',
            border: false,
            html: ''
        });
    },

    /*
     * Create containter for enemy's avatar
     */
    createEnemyAvatar: function () {
        var self = this;
        self.enemyAvatarComponent = new Ext.BoxComponent({
            id: 'combat-enemyavatar',
            border: false,
            html: ''
        });
    },

    /*
     * Create containter for combat log
     */
    createLog: function () {
        var self = this;
        self.logComponent = new Ext.Container({
            id: 'combat-log',
            border: false,
            autoScroll: true,
            html: ''
        });
    },

    /*
     * Create containter for main interface
     */
    createMain: function () {
        var self = this;
        self.mainComponent = new Ext.Container({
            id: 'combat-main',
            layout: 'fit',
            border: false,
            items: []
        });
    },

    /*
     * Generate viewport parameters
     */
    viewportParams: function () {
        var self = this;

        // myAvatar, mainComponent, enemyAvatar
        var topItems = [];
        if (self.myAvatarComponent) {
            topItems.push({
                xtype: 'container',
                width: self.myAvatarWidth,
                autoScroll: false,
                border: false,
                items: self.myAvatarComponent
            });
        }
        if (self.mainComponent) {
            topItems.push({
                xtype: 'container',
                border: false,
                autoScroll: true,
                style: {
                    padding: '10px 30px 10px 0px'
                },
                bodyCfg: {
                    cls: 'x-panel-body combat-main'
                },
                flex: 1,
                layout: 'fit',
                items: self.mainComponent
            });
        }
        if (self.enemyAvatarComponent) {
            topItems.push({
                xtype: 'container',
                width: self.enemyAvatarWidth,
                autoScroll: false,
                border: false,
                items: self.enemyAvatarComponent
            });
        }
        var viewportParams = {
            xtype: 'container',
            border: false,
            layout: 'hbox',
            layoutConfig: {
                align: 'stretch'
            },
            items: topItems
        };

        if (self.logComponent) {
            if (self.logLayout == 0) {
                viewportParams.region = 'north';
                viewportParams.height = self.combatHeight;
                viewportParams.split = self.logResize;
                viewportParams = {
                    xtype: 'container',
                    layout: 'border',
                    border: false,
                    style: {
                        padding: '10px 30px 10px 0px'
                    },
                    items: [
                        viewportParams,
                        {
                            xtype: 'container',
                            region: 'center',
                            border: false,
                            autoScroll: true,
                            layout: 'fit',
                            items: self.logComponent
                        }
                    ]
                };
            } else if (self.logLayout == 1) {
                viewportParams.region = 'center';
                viewportParams = {
                    xtype: 'container',
                    layout: 'border',
                    border: false,
                    items: [
                        viewportParams,
                        {
                            xtype: 'container',
                            region: 'south',
                            height: self.logHeight,
                            border: false,
                            autoScroll: true,
                            layout: 'fit',
                            split: self.logResize,
                            items: self.logComponent
                        }
                    ]
                };
            }
        }

        return viewportParams;
    },

    /*
     * Show all widgets required to display user interface
     */
    render: function () {
        var self = this;
        self.viewportComponent = new Ext.Viewport(self.viewportParams());
    },

    /*
     * Method for creating new members. Usually it's overriden
     * by combat implementations.
     */
    newMember: function (memberId) {
        var self = this;
        return new GenericCombatMember(self, memberId);
    },

    /*
     * React to "set myself" event
     */
    setMyself: function (memberId) {
        var self = this;
        GenericCombat.superclass.setMyself.call(self, memberId);
        self.myAvatarComponent.update(self.myself.renderAvatarHTML());
        self.viewportComponent.doLayout();
        self.showMemberList();
    },

    /*
     * For every element with class "c-<cls>"
     * run callback provided.
     */
    forEachElement: function (cls, callback) {
        var self = this;
        var els = Ext.getBody().query('.c-' + cls);
        for (var i = 0; i < els.length; i++) {
            callback(els[i]);
        }
    },

    /*
     * Notify combat that its controlled member
     * got right of turn
     */
    turnGot: function () {
        var self = this;
        GenericCombat.superclass.turnGot.call(self);
        self.hideMemberList();
        self.showActionSelector();
    },

    /*
     * Notify combat that its controlled member
     * lost right of turn
     */
    turnLost: function () {
        var self = this;
        GenericCombat.superclass.turnLost.call(self);
        self.hideActionSelector();
        self.showMemberList();
    },

    /*
     * Notify combat that its controlled member
     * lost right of turn due to timeout
     */
    turnTimeout: function () {
        var self = this;
        GenericCombat.superclass.turnTimeout.call(self);
        self.hideActionSelector();
        self.showMemberList();
    },

    /*
     * Notify combat that the action has just been submitted
     */
    actionSubmitted: function () {
        var self = this;
        GenericCombat.superclass.turnLost.call(self);
        self.hideActionSelector();
        self.showMemberList();
    },

    /*
     * Notify combat that the action has just been submitted
     */
    actionFailed: function () {
        var self = this;
        GenericCombat.superclass.turnLost.call(self);
        self.hideMemberList();
        self.showActionSelector();
    },

    /*
     * Show interface where player can choose an action
     */
    showActionSelector: function () {
        var self = this;
        if (!self.myself) {
            return;
        }
        if (!self.actionSelector) {
            self.actionSelector = self.newActionSelector();
        }
        self.actionSelector.show();
        self.viewportComponent.doLayout();
    },

    /*
     * Hide interface where player can choose an action
     */
    hideActionSelector: function () {
        var self = this;
        if (!self.actionSelector) {
            return;
        }
        self.actionSelector.hide();
        self.viewportComponent.doLayout();
    },

    /*
     * Show interface with list of members
     */
    showMemberList: function () {
        var self = this;
        if (!self.memberList) {
            self.memberList = self.newMemberList();
        }
        self.memberList.show();
        self.viewportComponent.doLayout();
    },

    /*
     * Hide interface with list of members
     */
    hideMemberList: function () {
        var self = this;
        if (!self.memberList) {
            return;
        }
        self.memberList.hide();
        self.viewportComponent.doLayout();
    },

    /*
     * Create new action selector (override to use another class)
     */
    newActionSelector: function () {
        var self = this;
        return new GenericCombatActionSelector(self);
    },
    
    /*
     * Create new member list (override to use another class)
     */
    newMemberList: function () {
        var self = this;
        return new GenericCombatMemberList(self);
    },
    
    /*
     * Show received log entries on the screen
     */
    log: function (entries) {
        var self = this;
        if (!self.logComponent) {
            return;
        }
        for (var i = 0; i < entries.length; i++) {
            self.logComponent.add({
                xtype: 'box',
                html: entries[i].text,
                cls: entries[i].cls
            });
        }
        self.logComponent.doLayout();
        self.logComponent.el.scroll('down', 1000000, true);
    }
});

var GenericCombatMember = Ext.extend(CombatMember, {
    constructor: function (combat, memberId) {
        var self = this;
        GenericCombatMember.superclass.constructor.call(self, combat, memberId);
        self.avatarDeps = {};
    },

    /*
     * Set member parameter "key" to value "value"
     */
    setParam: function (key, value) {
        var self = this;
        GenericCombatMember.superclass.setParam.call(self, key, value);
        self.renderChangedParam(key, value);
    },

    /*
     * Apply changed parameter value to currently
     * displayed interface
     */
    renderChangedParam: function (key, value) {
        var self = this;
        if (key === 'image') {
            self.forEachElement('image', function (el) {
                el.src = value;
            });
        }
    },

    /*
     * For every element with class "c-m-<memberId>-<cls>"
     * run callback provided.
     */
    forEachElement: function (cls, callback) {
        var self = this;
        self.combat.forEachElement('m-' + self.id + '-' + cls, callback);
    },

    /*
     * Generate HTML for rendering member's avatar
     * Side effects: reset dependencies
     */
    renderAvatarHTML: function () {
        var self = this;
        self.avatarDeps = {};
        self.avatarDepCnt = 0;
        var html = '<div class="combat-member-avatar">';
        for (var i = 0; i < self.combat.aboveAvatarParams.length; i++) {
            html += self.renderAvatarParamHTML(self.combat.aboveAvatarParams[i]);
        }
        html += self.renderImageHTML();
        for (var i = 0; i < self.combat.belowAvatarParams.length; i++) {
            html += self.renderAvatarParamHTML(self.combat.belowAvatarParams[i]);
        }
        html += '</div>';
        return html;
    },

    /*
     * Generate HTML for rendering member's image
     */
    renderImageHTML: function () {
        var self = this;
        var image = self.params.image;
        if (!image) {
            return '<div class="combat-member-container"><div class="combat-member-image" style="width: ' + self.combat.avatarWidth + 'px; height: ' +
                self.combat.avatarHeight + 'px"></div></div>';
        }
        return '<div class="combat-member-container"><img class="combat-member-image c-m-' +
            self.id + '-image" src="' + image + '" alt="" style="width: ' +
            self.combat.avatarWidth + 'px; height: ' + self.combat.avatarHeight + 'px" /></div>';
    },

    /*
     * Parse syntax tree provided and register dependencies between "member" parameters and
     * CSS classes of displayed expressions.
     */
    registerAvatarParamDeps: function (cls, type, val, deps) {
        var self = this;
        for (var i = 0; i < deps.length; i++) {
            var dep = deps[i];
            if (dep.length >= 2 && dep[0] == 'member') {
                var param = dep[1];
                if (!self.avatarDeps[param]) {
                    self.avatarDeps[param] = {};
                }
                if (!self.avatarDeps[param][cls]) {
                    self.avatarDeps[param][cls] = {};
                }
                self.avatarDeps[param][cls][type] = val;
            }
        }
    },

    /*
     * Generate HTML code for avatar parameter.
     * Side effects: register dependencies
     */
    renderAvatarParamHTML: function (param) {
        var self = this;
        var env = {
            globs: {
                combat: self.combat,
                member: self,
                viewer: self.combat.myself
            }
        };
        var html = '';
        var val = parent.MMOScript.evaluate(param.visible, env);
        var id = ++self.avatarDepCnt;
        html += '<div class="c-m-' + self.id + '-ap-' + id + '" style="display: ' + (val ? 'block' : 'none') + '">';
        var deps = parent.MMOScript.dependencies(param.visible);
        self.registerAvatarParamDeps('ap-' + id, 'visibility', param.visible, deps);
        if (param.type == 'tpl') {
            deps = parent.MMOScript.dependenciesText(param.tpl);
            val = parent.MMOScript.evaluateText(param.tpl, env);
            html += val;
            self.registerAvatarParamDeps('ap-' + id, 'html', param.tpl, deps);
        }
        html += '</div>';
        return html;
    },

    /*
     * Called when member parameters changed
     * Format: map(key => value)
     */
    paramsChanged: function (params) {
        var self = this;
        GenericCombatMember.superclass.paramsChanged.call(self, params);
        var repaint = false;
        var targetCmp = self.targetCmp && self.targetCmp.el && self.targetCmp.el.dom;
        // prepare list of avatar parameters that may be affected by
        // parameters change
        var affectedClasses, affectedTargetCmp;
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                var deps = self.avatarDeps[key];
                for (var dkey in deps) {
                    if (deps.hasOwnProperty(dkey)) {
                        if (!affectedClasses) {
                            affectedClasses = {};
                        }
                        affectedClasses[dkey] = deps[dkey];
                    }
                }
                if (targetCmp) {
                    if (self.targetCmpDeps[key]) {
                        affectedTargetCmp = true;
                    }
                }
            }
        }
        // for every "possibly changed" parameter evaluate its value
        if (affectedClasses) {
            var env = {
                globs: {
                    combat: self.combat,
                    member: self,
                    viewer: self.combat.myself
                }
            };
            for (var cls in affectedClasses) {
                if (affectedClasses.hasOwnProperty(cls)) {
                    var ent = affectedClasses[cls];
                    for (var type in ent) {
                        if (ent.hasOwnProperty(type)) {
                            var script = ent[type];
                            var val;
                            if (type == 'visibility') {
                                val = parent.MMOScript.evaluate(script, env);
                                self.forEachElement(cls, function (el) {
                                    el.style.display = val ? 'block' : 'none';
                                });
                            } else if (type == 'html') {
                                val = parent.MMOScript.evaluateText(script, env);
                                self.forEachElement(cls, function (el) {
                                    el.innerHTML = val;
                                });
                            }
                        }
                    }
                }
            }
            repaint = true;
        }
        // targetCmp needs to be updated
        if (affectedTargetCmp) {
            var env = {
                globs: {
                    combat: self.combat,
                    member: self,
                    viewer: self.combat.myself
                }
            };
            self.targetCmp.update(parent.MMOScript.evaluateText(self.targetCmpTemplate, env));
            repaint = true;
        }
        if (repaint) {
            self.combat.viewportComponent.doLayout();
        }
    },

    /*
     * Create component serving as an item in the list of members
     * template is a MMOScript text template
     */
    newListItem: function (template) {
        var self = this;
        self.targetCmpDeps = {};
        var env = {
            globs: {
                combat: self.combat,
                member: self,
                viewer: self.combat.myself
            }
        };
        var deps = parent.MMOScript.dependenciesText(template);
        for (var i = 0; i < deps.length; i++) {
            var dep = deps[i];
            if (dep.length >= 2 && dep[0] == 'member') {
                var param = dep[1];
                self.targetCmpDeps[param] = true;
            }
        }
        self.targetCmpTemplate = template;
        self.targetCmp = new Ext.BoxComponent({
            html: parent.MMOScript.evaluateText(template, env),
            style: {
                padding: '10px'
            },
            cls: ((self.combat.myself && self.params.team == self.combat.myself.params.team) ? 'combat-target-ally' : 'combat-target-enemy'),
            select: function () {
                this.removeClass('combat-item-deselected');
                this.removeClass('combat-target-deselected');
                this.addClass('combat-item-selected');
                this.addClass('combat-target-selected');
            },
            deselect: function () {
                this.removeClass('combat-item-selected');
                this.removeClass('combat-target-selected');
                this.addClass('combat-item-deselected');
                this.addClass('combat-target-deselected');
            }
        });
    },

    /*
     * Show avatar of this member in the enemy frame
     */
    showEnemy: function () {
        var self = this;
        if (self.combat.enemyAvatarComponent) {
            self.combat.enemyAvatarComponent.update(self.renderAvatarHTML());
            self.combat.viewportComponent.doLayout();
        }
    }
});

var GenericCombatActionSelector = Ext.extend(Object, {
    constructor: function (combat) {
        var self = this;
        self.combat = combat;
        self.shown = false;
        self.myself = combat.myself;
        self.targetedList = [];
    },

    /*
     * Show action selector
     */
    show: function () {
        var self = this;
        if (self.shown) {
            self.hide();
        }
        /*
         * When action selector is shown without "Go" button,
         * all targets have to be deselected.
         */
        if (!self.combat.goButtonEnabled) {
            self.deselectTargets(false);
        }
        self.action = null;
        self.actionInfo = null;
        self.actionItems = self.newActionItems();
        self.targetItems = self.newTargetItems();
        var items = [
            self.actionItems,
            self.targetItems
        ];
        if (self.combat.goButtonEnabled) {
            self.goButton = self.newGoButton();
            items.push(self.goButton);
        }
        self.cmp = new Ext.Container({
            id: 'combat-actions-selector',
            xtype: 'container',
            layout: 'hbox',
            border: false,
            layoutConfig: {
                align: 'middle'
            },
            autoScroll: true,
            items: items,
            listeners: {
                render: function () {
                    setTimeout(function () {
                        if (self.shown) {
                            if (self.combat.goButtonEnabled) {
                                self.selectLastAction();
                                self.updateTargets();
                                self.updateGoButtonAvailability();
                            } else {
                                self.selectLastAction();
                                self.updateTargets();
                            }
                        }
                    }, 1);
                }
            }
        });
        self.combat.mainComponent.removeAll(true);
        self.combat.mainComponent.add(self.cmp);
        self.shown = true;
        self.combat.viewportComponent.doLayout();
        self.combat.viewportComponent.doLayout();  // FIXME: workaround for unknown bug
    },

    /*
     * Hide action selector
     */
    hide: function () {
        var self = this;
        if (!self.shown) {
            return;
        }
        self.shown = false;
        // Destroy all other items
        self.actionItems = undefined;
        self.targetItems = undefined;
        self.combat.mainComponent.removeAll(true);
        delete self.cmp;
    },

    /*
     * Create action selector component
     */
    newActionItems: function () {
        var self = this;
        var env = {
            globs: {
                combat: self.combat,
                member: self.combat.myself
            }
        };
        var items = [];
        for (var i = 0; i < self.combat.availableActions.length; i++) {
            var ent = self.combat.availableActions[i];
            var act = self.combat.actions[ent.action];
            if (!act) {
                continue;
            }
            (function (ent, act) {
                var cmp = new Ext.BoxComponent({
                    id: 'combat-action-id-' + act.code,
                    cls: 'combat-action-selector combat-item-deselected combat-action-deselected',
                    style: {
                        padding: '10px'
                    },
                    html: act.name,
                    listeners: {
                        render: function () {
                            self.registerActionTip(cmp, act, env);
                            this.getEl().on('click', function () {
                                self.selectAction(ent, act);
                                /*
                                 * Untargeted actions are executed immediately.
                                 * Combat actions in absense of selectable targets are
                                 * executed immediately too.
                                 */
                                if (!self.combat.goButtonEnabled && self.action && (!self.action.targets ||
                                        (self.myself.params.targets != 'selectable' && !self.actionInfo.ignore_preselected))) {
                                    self.go();
                                }
                            });
                        }
                    }
                });
                items.push(cmp);
                /* Action attributes */
                if (act.attributes && act.attributes.length) {
                    var attrItems = [];
                    for (var j = 0; j < act.attributes.length; j++) {
                        var attr = act.attributes[j];
                        attrItems.push(new Ext.BoxComponent({
                            cls: 'combat-action-attribute-name',
                            style: {
                                margin: '5px 0px 5px 0px'
                            },
                            html: attr.name
                        }));
                        if (attr.type === 'static') {
                            for (var k = 0; k < attr.values.length; k++) {
                                var value = attr.values[k];
                                (function (attr, value) {
                                    attrItems.push(new Ext.BoxComponent({
                                        id: 'combat-attribute-' + act.code + '-' + attr.code + '-' + value.code,
                                        cls: 'combat-attribute-selector combat-item-deselected combat-attribute-deselected combat-attribute-' + act.code + '-' + attr.code,
                                        style: {
                                            margin: '3px 0px 3px 20px',
                                            padding: '3px 10px 3px 10px',
                                        },
                                        html: value.title,
                                        listeners: {
                                            render: function () {
                                                this.getEl().on('click', function () {
                                                    self.selectAttribute(attr.code, value.code, 'combat-attribute-' + act.code + '-' + attr.code);
                                                });
                                            }
                                        }
                                    }));
                                })(attr, value);
                            }
                        } else if (attr.type === 'int') {
                            attrItems.push(new Ext.form.NumberField({
                                id: 'combat-attribute-' + act.code + '-' + attr.code,
                                style: {
                                    margin: '3px 10px 3px 30px'
                                },
                                allowDecimals: false,
                                value: 0,
                                fieldClass: '',
                                width: 50
                            }));
                        }
                    }
                    var attrCmp = new Ext.Container({
                        id: 'combat-action-attributes-' + act.code,
                        style: {
                            padding: '0px 0px 0px 30px'
                        },
                        items: attrItems,
                        hidden: true
                    });
                    items.push(attrCmp);
                }
            })(ent, act);
        }
        return new Ext.Container({
            id: 'combat-actions-box',
            items: items,
            flex: 1,
            style: {
                paddingRight: '10px',
            },
            border: false,
            autoHeight: true
        });
    },

    /*
     * Register quicktip for the action selector item
     */
    registerActionTip: function (cmp, action, env) {
        var self = this;
        Ext.QuickTips.register({
            target: cmp,
            title: action.name,
            text: parent.MMOScript.evaluateText(action.description, env),
            dismissDelay: 10000
        });
    },

    /*
     * Select specified action and show prompt to the user to choose action attributes
     */
    selectAction: function(act, actInfo) {
        var self = this;
        if (self.action) {
            var attrsCmp = Ext.getCmp('combat-action-attributes-' + self.action.action);
            if (attrsCmp) {
                attrsCmp.hide();
            }
        }
        Ext.select('.combat-action-selected', self.actionItems).
            removeClass('combat-item-selected').
            removeClass('combat-action-selected').
            addClass('combat-item-deselected').
            addClass('combat-action-deselected');
        self.action = act;
        self.actionInfo = actInfo;
        self.actionAttrs = {};
        if (act) {
            Ext.select('#combat-action-id-' + actInfo.code).
                removeClass('combat-item-deselected').
                removeClass('combat-action-deselected').
                addClass('combat-item-selected').
                addClass('combat-action-selected');
            var attrsCmp = Ext.getCmp('combat-action-attributes-' + self.action.action);
            if (attrsCmp) {
                Ext.select('.combat-attribute-selected', self.actionItems).
                    removeClass('combat-item-selected').
                    removeClass('combat-attribute-selected').
                    addClass('combat-item-deselected').
                    addClass('combat-attribute-deselected');
                attrsCmp.show();
            }
        }
        /* 
         * If "Go" button is available, preserve the list of targets and check
         * "Go" button visibility. Otherwize just clear the list of targets
         */
        if (self.combat.goButtonEnabled) {
            self.updateTargets();
            self.deselectExcessiveTargets();
            self.autoSelectTargets();
            self.showSelectedEnemy();
            self.updateGoButtonAvailability();
        } else {
            self.updateTargets();
        }
        self.combat.viewportComponent.doLayout();
        self.combat.viewportComponent.doLayout();
    },

    /*
     * Make targets available/unavailable for selected action
     */
    updateTargets: function () {
        var self = this;
        var targeted = {};
        if (self.action) {
            if (self.myself.params.targets && self.myself.params.targets.forEach && !self.actionInfo.ignore_preselected) {
                var targets = self.myself.params.targets;
                for (var i = 0; i < targets.length; i++) {
                    targeted[targets[i]] = true;
                }
            } else {
                var targets = self.action.targets;
                if (targets) {
                    for (var i = 0; i < targets.length; i++) {
                        targeted[targets[i]] = true;
                    }
                }
            }
        }
        for (var memberId in self.combat.members) {
            if (!self.combat.members.hasOwnProperty(memberId)) {
                continue;
            }
            var member = self.combat.members[memberId];
            if (!self.action && !self.combat.goButtonEnabled) {
                self.disableTarget(member, false);
            } else if (self.myself.params.targets == 'selectable' || (self.action && self.actionInfo.ignore_preselected)) {
                // Selectable targets
                if (targeted && targeted[memberId]) {
                    /* If "Go" button is available, preserve old selection.
                     * Otherwize clear selection */
                    if (self.combat.goButtonEnabled) {
                        self.enableTarget(member, member.targeted);
                    } else {
                        self.enableTarget(member, false);
                    }
                } else {
                    self.disableTarget(member, false);
                }
            } else if (self.myself.params.targets) {
                // Preselected targets
                self.disableTarget(member, targeted[memberId]);
            } else {
                // No targets
                self.disableTarget(member, false);
            }
        }
    },

    /*
     * Enable combat target member
     */
    enableTarget: function (member, selectedState) {
        var self = this;
        if (member.targetCmp) {
            member.targetCmp.enable();
        }
        self.selectTarget(member, selectedState ? true : false);
    },

    /*
     * Disable combat target member
     */
    disableTarget: function (member, selectedState) {
        var self = this;
        if (member.targetCmp) {
            member.targetCmp.disable();
        }
        self.selectTarget(member, selectedState ? true : false);
    },

    /*
     * Make "Go" button available/unavailable
     */
    updateGoButtonAvailability: function () {
        var self = this;
        if (!self.goButton) {
            return;
        }
        if (self.actionData(true)) {
            self.goButton.enable();
        } else {
            self.goButton.disable();
        }
    },

    /*
     * Deselect all targets
     */
    deselectTargets: function (updateComponents) {
        var self = this;
        for (var memberId in self.combat.members) {
            if (!self.combat.members.hasOwnProperty(memberId)) {
                continue;
            }
            var member = self.combat.members[memberId];
            member.targeted = false;
            if (member.targetCmp && updateComponents !== false) {
                member.targetCmp.deselect();
            }
        }
        self.targetedList = [];
    },

    /*
     * Create targets selector component
     */
    newTargetItems: function () {
        var self = this;
        var items = [];
        for (var memberId in self.combat.members) {
            if (!self.combat.members.hasOwnProperty(memberId)) {
                continue;
            }
            var member = self.combat.members[memberId];
            (function (member) {
                member.newListItem(self.combat.targetTemplate);
                member.targetCmp.addListener('render', function () {
                    this.getEl().on('click', function () {
                        if (!this.dom.disabled) {
                            self.toggleTarget(member);
                        }
                    });
                    this.getEl().on('mouseover', function () {
                        member.showEnemy();
                        self.shownEnemy = member;
                    });
                    this.getEl().on('mouseout', function () {
                        self.showSelectedEnemy();
                    });
                });
            })(member);
            if (member.targeted) {
                member.targetCmp.select();
            } else {
                member.targetCmp.deselect();
            }
            items.push(member.targetCmp);
        }
        return new Ext.Container({
            id: 'combat-targets-box',
            items: items,
            border: false,
            flex: 1,
            style: {
                paddingRight: '10px'
            }
        });
    },

    /*
     * Select action attribute
     */
    selectAttribute: function (attr, value, cls) {
        var self = this;
        self.actionAttrs[attr] = value;
        Ext.select('.' + cls, self.actionItems).
            removeClass('combat-item-selected').
            removeClass('combat-attribute-selected').
            addClass('combat-item-deselected').
            addClass('combat-attribute-deselected');
        Ext.select('#combat-attribute-' + self.action.action + '-' + attr + '-' + value).
            removeClass('combat-item-deselected').
            removeClass('combat-attribute-deselected').
            addClass('combat-item-selected').
            addClass('combat-attribute-selected');
        self.updateGoButtonAvailability();
    },

    /*
     * Select/deselect action target
     */
    selectTarget: function (member, state) {
        var self = this;
        if (member.targeted == state) {
            return;
        }
        member.targeted = state;
        if (member.targetCmp) {
            if (state) {
                member.targetCmp.select();
            } else {
                member.targetCmp.deselect();
            }
        }
        /*
         * Update self.targetedList (remove old occurencies
         * and add new one if needed).
         */
        for (var i = 0; i < self.targetedList.length; i++) {
            if (self.targetedList[i].id == member.id) {
                self.targetedList.splice(i, 1);
                i--;
            }
        }
        if (state) {
            self.targetedList.push(member);
        }
        /* 
         * If "Go" button is available, update visibility of the button.
         * Otherwize check whether target list is filled
         */
        if (self.combat.goButtonEnabled) {
            self.deselectExcessiveTargets();
            self.updateGoButtonAvailability();
        } else {
            /* The alhorithm in absense of "Go" button fires action when
             * either targets_max is reached, or targets_min is reached AND
             * no other possible targets present. */
            if (self.action && self.action.targets) {
                var fire = self.targetedList.length == self.action.targets_max;
                if (!fire && self.targetedList.length >= self.action.targets_min) {
                    fire = true;
                    for (var i = 0; i < self.action.targets.length; i++) {
                        var targetId = self.action.targets[i];
                        var target = self.combat.members[targetId];
                        if (!target.targeted) {
                            fire = false;
                            break;
                        }
                    }
                }
                if (fire) {
                    self.go();
                }
            }
        }
    },

    /*
     * Deselect oldmost targets if their total number is greater than
     * targets_max.
     */
    deselectExcessiveTargets: function () {
        var self = this;
        if (!self.action) {
            return;
        }
        while (self.targetedList.length > self.action.targets_max) {
            var member = self.targetedList[0];
            self.targetedList.splice(0, 1);
            member.targeted = false;
            if (member.targetCmp) {
                member.targetCmp.deselect();
            }
        }
    },

    /*
     * Toggle "selected" state for given member
     */
    toggleTarget: function (member) {
        var self = this;
        self.selectTarget(member, !member.targeted);
    },

    /*
     * Select the same action as previously sent to the server
     */
    selectLastAction: function () {
        var self = this;
        if (!self.lastAction) {
            /* Even if no last action selected, but we have only one
             * possible action, auto select it */
            if (self.combat.goButtonEnabled && (self.combat.availableActions.length == 1)) {
                var ent = self.combat.availableActions[0];
                var act = self.combat.actions[ent.action];
                if (act) {
                    self.selectAction(ent, act);
                }
            }
            self.updateTargets();
            return;
        }
        for (var i = 0; i < self.combat.availableActions.length; i++) {
            var ent = self.combat.availableActions[i];
            if (ent.action == self.lastAction) {
                var act = self.combat.actions[ent.action];
                if (act) {
                    /*
                     * If the interface is running without "Go" button, don't
                     * autoselect untargeted actions.
                     */
                    if (!ent.targets && !self.combat.goButtonEnabled) {
                        break;
                    }
                    self.selectAction(ent, act);
                    return;
                }
            }
        }
        self.updateTargets();
    },

    /*
     * If currently displayed enemy is not a selected target, then
     * show first selected enemy in the right frame. If no enemies
     * are selected, then select random enemies and show first selected
     * enemy in the right frame.
     *
     * Return true if needed to select new targets
     */
    showSelectedEnemy: function () {
        var self = this;
        /* If no action with target is selected, just return */
        if (!self.action || !self.action.targets) {
            return false;
        }
        /* If currently shown enemy is a valid target, return */
        if (self.shownEnemy) {
            for (var i = 0; i < self.action.targets.length; i++) {
                var targetId = self.action.targets[i];
                if (self.shownEnemy.id == targetId) {
                    return false;
                }
            }
        }
        /* Find first selected enemy */
        for (var i = 0; i < self.action.targets.length; i++) {
            var targetId = self.action.targets[i];
            var member = self.combat.members[targetId];
            if (member.targeted) {
                member.showEnemy();
                self.shownMember = member;
                return false;
            }
        }
        return true;
    },

    /*
     * Autoselect targets for the action
     */
    autoSelectTargets: function () {
        var self = this;
        /* Automatically select random targets (not available without "Go" button) */
        if ((self.combat.myself.params.targets == 'selectable' || self.action && self.actionInfo.ignore_preselected) &&
                self.combat.goButtonEnabled && self.action.targets) {
            var targets = self.action.targets.slice();
            var targeted = 0;
            var shown = false;
            while (targets.length > 0 && targeted < self.action.targets_max) {
                var i = Math.floor(Math.random() * targets.length);
                var targetId = targets[i];
                targets.splice(i, 1);
                var member = self.combat.members[targetId];
                self.selectTarget(member, true);
                targeted++;
                if (!shown) {
                    shown = true;
                    member.showEnemy();
                    self.shownMember = member;
                }
            }
        }
    },

    /*
     * Create go button component.
     */
    newGoButton: function () {
        var self = this;
        return new Ext.Container({
            id: 'combat-go-box',
            items: [{
                xtype: 'box',
                html: self.combat.goButtonText,
                style: {
                    padding: '10px'
                },
                cls: 'combat-item-deselected combat-go-button',
                listeners: {
                    render: function () {
                        this.getEl().on('click', function () {
                            if (!this.dom.disabled) {
                                self.go();
                            }
                        });
                    }
                }
            }],
            border: false,
            flex: 1
        });
    },

    /*
     * Submit player's action to the server
     */
    go: function () {
        var self = this;
        var data = self.actionData();
        if (!data) {
            return;
        }
        self.lastAction = self.action.action;
        self.combat.actionSubmitted();
        self.combat.submitAction(data, function (err) {
            if (err == 'sendInProgress') {
                self.combat.actionFailed();
                Game.error(undefined, gt.gettext('Your action is already being sent to server'));
            } else if (err == 'serverError') {
                self.combat.actionFailed();
                Game.error(undefined, gt.gettext('Error connecting to the server'));
            } else if (err == 'combatTerminated') {
                self.combat.actionFailed();
                Game.error(undefined, gt.gettext('Combat was terminated'));
            } else if (err) {
                self.combat.actionFailed();
                Game.error(undefined, err);
            }
        });
    },

    /*
     * Prepare action data to be sent to the server. In case of error show message to player and
     * return null.
     */
    actionData: function (silent) {
        var self = this;
        if (!self.action) {
            if (!silent) {
                Game.error(undefined, gt.gettext('Action is not selected'));
            }
            return null;
        }
        var data = {
            action: self.action.action
        };
        /* Targets */
        if (self.combat.myself.params.targets == 'selectable' || self.actionInfo.ignore_preselected) {
            if (self.action.targets) {
                var targets = [];
                for (var i = 0; i < self.action.targets.length; i++) {
                    var targetId = self.action.targets[i];
                    if (self.combat.members[targetId].targeted) {
                        targets.push(targetId);
                    }
                }
                if (targets.length < self.action.targets_min) {
                    if (!silent) {
                        Game.error(undefined, sprintf(gt.gettext('Minimal number of targets for this action is %d'), self.action.targets_min));
                    }
                    return null;
                }
                if (targets.length > self.action.targets_max) {
                    if (!silent) {
                        Game.error(undefined, sprintf(gt.gettext('Maximal number of targets for this action is %d'), self.action.targets_max));
                    }
                    return null;
                }
                data.targets = targets;
            }
        } else if (self.combat.myself.params.targets) {
            data.targets = self.combat.myself.params.targets;
        }
        /* Attributes */
        if (self.actionInfo.attributes) {
            for (var i = 0; i < self.actionInfo.attributes.length; i++) {
                var attr = self.actionInfo.attributes[i];
                if (attr.type == 'static') {
                    if (self.actionAttrs[attr.code] !== undefined) {
                        data[attr.code] = self.actionAttrs[attr.code];
                    } else {
                        if (!silent) {
                            Game.error(undefined, sprintf(gt.gettext('Not selected: %s'), attr.name));
                        }
                        return null;
                    }
                } else if (attr.type == 'int') {
                    data[attr.code] = 0;
                    var numberField = Ext.getCmp('combat-attribute-' + self.action.action + '-' + attr.code);
                    if (numberField) {
                        data[attr.code] = numberField.getValue();
                    }
                }
            }
        }
        return data;
    }
});

var GenericCombatMemberList = Ext.extend(Object, {
    constructor: function (combat) {
        var self = this;
        self.combat = combat;
        self.shown = false;
    },

    /*
     * Show member list
     */
    show: function () {
        var self = this;
        if (self.shown) {
            self.hide();
        }
        var items = [];
        for (var memberId in self.combat.members) {
            if (!self.combat.members.hasOwnProperty(memberId)) {
                continue;
            }
            var member = self.combat.members[memberId];
            (function (member) {
                member.newListItem(self.combat.memberListTemplate);
                member.targetCmp.addListener('render', function () {
                    this.getEl().on('mouseover', function () {
                        member.showEnemy();
                    });
                });
            })(member);
            member.targetCmp.deselect();
            items.push(member.targetCmp);
        }
        self.cmp = new Ext.Container({
            id: 'combat-member-list-interface',
            xtype: 'container',
            layout: 'hbox',
            border: false,
            layoutConfig: {
                align: 'middle'
            },
            autoScroll: true,
            items: [
                {
                    xtype: 'container',
                    id: 'combat-member-list',
                    items: items,
                    border: false,
                    flex: 1,
                    style: {
                        paddingRight: '10px'
                    }
                }
            ]
        });
        self.combat.mainComponent.removeAll(true);
        self.combat.mainComponent.add(self.cmp);
        self.shown = true;
        self.combat.viewportComponent.doLayout();
    },

    /*
     * Hide member list
     */
    hide: function () {
        var self = this;
        if (!self.shown) {
            return;
        }
        self.shown = false;
        self.combat.mainComponent.removeAll(true);
        delete self.cmp;
    }
});
