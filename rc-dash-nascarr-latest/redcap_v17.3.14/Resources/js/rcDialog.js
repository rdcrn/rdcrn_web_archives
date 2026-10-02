/**
 * rcDialog
 *
 * A small Bootstrap-based dialog wrapper for REDCap pages and custom scripts.
 * The API intentionally resolves every dismissal through an explicit button path.
 */
(function(window, document) {
	'use strict';

	const STYLE_ID = 'rc-dialog-styles';
	const DIALOG_ID_PREFIX = 'rc-dialog-';
	const STACK_OFFSET_X = 32;
	const STACK_OFFSET_Y = 28;
	const STACK_MATCH_TOLERANCE = 4;
	const STACK_INTERACTION_WINDOW_MS = 2000;
	const TABBED_SCROLL_EDGE_FADE = 30;
	const DEFAULT_MIN_WIDTH = 200;
	const DEFAULT_MIN_HEIGHT = 100;
	let dialogCounter = 0;
	let tabbedCounter = 0;
	let activeDialogs = [];
	let lastInteractionDialog = null;
	let lastInteractionTime = 0;

	//#region Constants and built-in strings
	const defaultStrings = {
		close: 'Close',
		cancel: 'Cancel',
		ok: 'OK',
		yes: 'Yes',
		no: 'No',
		save: 'Save',
		load: 'Load',
		'delete': 'Delete',
		previous: 'Previous',
		next: 'Next',
		'continue': 'Continue',
		finish: 'Finish',
		add: 'Add',
		noticeTitle: 'NOTICE',
		errorTitle: 'ERROR',
		splitDropdownActions: '{label} actions',
		splitDropdownToggle: 'Toggle dropdown'
	};

	const languageKeys = {
		close: 'rc_dialog_close',
		cancel: 'rc_dialog_cancel',
		ok: 'rc_dialog_ok',
		yes: 'rc_dialog_yes',
		no: 'rc_dialog_no',
		save: 'rc_dialog_save',
		load: 'rc_dialog_load',
		'delete': 'rc_dialog_delete',
		previous: 'rc_dialog_previous',
		next: 'rc_dialog_next',
		'continue': 'rc_dialog_continue',
		finish: 'rc_dialog_finish',
		add: 'rc_dialog_add',
		noticeTitle: 'rc_dialog_noticetitle',
		errorTitle: 'rc_dialog_errortitle',
		splitDropdownActions: 'rc_dialog_splitdropdownactions',
		splitDropdownToggle: 'rc_dialog_splitdropdowntoggle'
	};

	const knownButtons = {
		close: { id: 'close', _labelKey: 'close', value: null, intent: 'secondary' },
		cancel: { id: 'cancel', _labelKey: 'cancel', value: false, intent: 'secondary' },
		ok: { id: 'ok', _labelKey: 'ok', value: true, intent: 'primary', autofocus: true },
		yes: { id: 'yes', _labelKey: 'yes', value: true, intent: 'primary', autofocus: true },
		no: { id: 'no', _labelKey: 'no', value: false, intent: 'secondary' },
		save: { id: 'save', _labelKey: 'save', value: 'save', intent: 'primary', autofocus: true },
		load: { id: 'load', _labelKey: 'load', value: 'load', intent: 'primary', autofocus: true },
		'delete': { id: 'delete', _labelKey: 'delete', value: 'delete', intent: 'danger', autofocus: true },
		add: { id: 'add', _labelKey: 'add', value: 'add', intent: 'primary', autofocus: true },
		previous: { id: 'previous', _labelKey: 'previous', value: 'previous', intent: 'secondary' },
		next: { id: 'next', _labelKey: 'next', value: 'next', intent: 'primary', autofocus: true },
		'continue': { id: 'continue', _labelKey: 'continue', value: 'continue', intent: 'primary', autofocus: true },
		finish: { id: 'finish', _labelKey: 'finish', value: 'finish', intent: 'primary', autofocus: true }
	};
	//#endregion

	//#region Public API
	function rcDialog(options) {
		return createDialog(options).promise;
	}

	Object.defineProperty(rcDialog, 'knownButtons', {
		enumerable: true,
		get: function() {
			return getKnownButtonsSnapshot();
		}
	});
	rcDialog.alert = function(options) {
		options = normalizeConvenienceOptions(options, 'body');
		if (!hasOwn(options, 'buttons')) options.buttons = ['close'];
		return rcDialog(options);
	};
	rcDialog.confirm = function(options) {
		options = normalizeConvenienceOptions(options, 'body');
		if (!hasOwn(options, 'buttons')) options.buttons = ['cancel', 'ok'];
		if (!hasOwn(options, 'closeButton')) options.closeButton = 'cancel';
		return rcDialog(options);
	};
	rcDialog.from = function(source, options) {
		return rcDialog(normalizeFromOptions(source, options || {}));
	};
	rcDialog.tabbed = function(options) {
		return createTabbed(options || {});
	};
	rcDialog.wizard = function(options) {
		return createWizard(options || {});
	};
	//#endregion

	//#region Convenience option helpers
	function normalizeConvenienceOptions(options, stringSlot) {
		if (typeof options === 'string') {
			const normalized = {};
			normalized[stringSlot] = options;
			return normalized;
		}
		return assign({}, options || {});
	}

	function normalizeFromOptions(source, options) {
		if (!options || typeof options !== 'object') {
			throw configError('rcDialog.from() options must be an object.');
		}
		const sourceEl = resolveSourceElement(source);
		const normalized = assign({}, options);
		if (!hasOwn(normalized, 'body') && !hasOwn(normalized, 'bodyHtml')) {
			normalized.bodyHtml = sourceEl.innerHTML;
		}
		if (!hasOwn(normalized, 'title') && !hasOwn(normalized, 'titleHtml')) {
			const sourceTitle = sourceEl.getAttribute('title');
			normalized.title = sourceTitle || getDialogString('noticeTitle');
		}
		if (!hasOwn(normalized, 'buttons')) {
			normalized.buttons = ['close'];
		}
		return normalized;
	}

	function resolveSourceElement(source) {
		if (typeof source === 'string') {
			const selected = document.querySelector(source);
			if (!selected) {
				throw configError('rcDialog.from() source selector did not match an element.');
			}
			return selected;
		}
		if (isJQueryObject(source)) {
			if (!source.length) {
				throw configError('rcDialog.from() source jQuery object is empty.');
			}
			return source[0];
		}
		if (isNode(source) && source.nodeType === 1) {
			return source;
		}
		throw configError('rcDialog.from() source must be a selector, jQuery object, or DOM element.');
	}
	//#endregion

	//#region Dialog lifecycle
	function createDialog(userOptions) {
		if (typeof userOptions === 'string') {
			userOptions = { body: userOptions };
		}
		if (!userOptions || typeof userOptions !== 'object') {
			throw configError('Options must be an object.');
		}

		ensureStyles();

		const normalized = normalizeOptions(userOptions);
		const returnFocusElement = getActiveElement();
		const openerDialog = getDialogForElement(returnFocusElement) || getRecentInteractionDialog();
		const dialog = {
			id: DIALOG_ID_PREFIX + (++dialogCounter),
			options: normalized,
			openerDialog: openerDialog,
			cleanups: [],
			buttonElements: {},
			buttonContainers: {},
			childDialogCount: 0,
			childRegistered: false,
			childPositionPin: null,
			closed: false,
			closing: false,
			hasResult: false,
			resultValue: null,
			closeVersion: 0,
			progressValue: null,
			progressManual: false,
			progressForegroundColor: null,
			progressBackgroundColor: null,
			footerStatusManual: false,
			footerStatusContent: null,
			footerStatusIsHtml: false,
			footerPointerActive: false,
			buttonRenderPending: false,
			hasCloseButtonOverride: false,
			closeButtonOverride: false,
			initialFocusTarget: null,
			hasInitialFocusOverride: false,
			focusAfterCloseTarget: null,
			hasFocusAfterCloseOverride: false,
			bodyLayoutConstrained: false,
			rendered: false
		};

		dialog.promise = new Promise(function(resolve, reject) {
			dialog.resolve = resolve;
			dialog.reject = reject;
		});

		const ctx = createContext(dialog);
		dialog.ctx = ctx;

		if (typeof normalized.setup === 'function') {
			normalized.setup(ctx);
		}

		const initialBody = evaluateContentSlot(normalized.bodySlot, ctx);

		normalized.display = resolveDisplayOptions(normalized, ctx, openerDialog);
		normalized.dismissal = resolveDismissalOptions(normalized, ctx);
		if (dialog.hasCloseButtonOverride) {
			ctx.setCloseButton(dialog.closeButtonOverride);
		}
		if (!dialog.progressManual) {
			setProgressValue(dialog, resolveConfiguredProgress(dialog), false);
		}

		renderShell(dialog);
		renderTitleArea(dialog);
		setBodyContent(dialog, initialBody, normalized.bodySlot.isHtml);
		renderFooterStatus(dialog);
		renderProgress(dialog);
		renderButtons(dialog);
		updateCloseControl(dialog);
		attachDialogEvents(dialog);
		dialog.modalController = createBootstrapModalController(dialog.modalEl, {
			backdrop: normalized.display.backdrop && !usesParentBackdrop(dialog),
			keyboard: false
		});

		dialog.modalController.whenShown(function() {
			activeDialogs.push(dialog);
			if (normalized.display.draggable && !dialog.dragEnabled) {
				dialog.dragEnabled = true;
				enableDrag(dialog);
			} else if (normalized.display.placement === 'centered-parent') {
				positionDialogOverParent(dialog);
			}
			if (normalized.display.allowResize && !dialog.resizeEnabled) {
				dialog.resizeEnabled = true;
				enableResize(dialog);
			}
			focusInitialElement(dialog);
			notifyLocalEvent(dialog, 'dialog:shown');
		});

		dialog.modalController.whenHidden(function() {
			finalizeDialog(dialog, returnFocusElement);
		});

		registerChildDialog(dialog);
		installParentBackdrop(dialog);

		try {
			document.body.appendChild(dialog.modalEl);
			dialog.rendered = true;
			dialog.modalController.show();
		} catch (error) {
			unregisterChildDialog(dialog);
			throw error;
		}

		return dialog;
	}
	//#endregion

	//#region Option normalization
	function normalizeOptions(raw) {
		validateContentPair(raw, 'title', 'titleHtml');
		validateContentPair(raw, 'subtitle', 'subtitleHtml');
		validateContentPair(raw, 'body', 'bodyHtml');
		validateContentPair(raw, 'footerStatus', 'footerStatusHtml');

		let state = hasOwn(raw, 'state') ? raw.state : {};
		if (state == null) state = {};
		if (typeof state !== 'object') {
			throw configError('state must be an object.');
		}

		const buttonSpecs = hasOwn(raw, 'buttons') ? raw.buttons : ['close'];
		if (!Array.isArray(buttonSpecs)) {
			throw configError('buttons must be an array.');
		}

		const buttons = normalizeButtons(buttonSpecs);

		validateFocusOption(raw, 'initialFocus');
		validateFocusOption(raw, 'focusAfterClose');

		return {
			raw: raw,
			state: state,
			buttons: buttons,
			buttonMap: indexButtons(buttons),
			bodySlot: makeContentSlot(raw, 'body', 'bodyHtml'),
			footerStatusSlot: makeContentSlot(raw, 'footerStatus', 'footerStatusHtml'),
			hasProgressOption: hasOwn(raw, 'progress'),
			setup: composeSetups(raw.__rcDialogSetup, raw.setup)
		};
	}

	function composeSetups(internalSetup, publicSetup) {
		if (typeof internalSetup !== 'function') return typeof publicSetup === 'function' ? publicSetup : null;
		if (typeof publicSetup !== 'function') return internalSetup;
		return function(ctx) {
			internalSetup(ctx);
			publicSetup(ctx);
		};
	}

	function makeContentSlot(options, plainKey, htmlKey) {
		if (hasOwn(options, htmlKey)) {
			return { value: options[htmlKey], isHtml: true };
		}
		if (hasOwn(options, plainKey)) {
			return { value: options[plainKey], isHtml: false };
		}
		return { value: '', isHtml: false };
	}

	function validateContentPair(options, plainKey, htmlKey, prefix) {
		if (hasOwn(options, plainKey) && hasOwn(options, htmlKey)) {
			throw configError((prefix || '') + plainKey + ' and ' + htmlKey + ' are mutually exclusive.');
		}
	}

	function normalizeButtons(buttonSpecs) {
		const buttons = [];
		buttonSpecs.forEach(function(spec) {
			const button = normalizeButtonSpec(spec);
			if (!button.id) {
				throw configError('Every button must have an id.');
			}
			buttons.push(button);
		});
		indexButtons(buttons);
		return buttons;
	}

	function normalizeButtonSpec(spec) {
		let button;
		if (typeof spec === 'string') {
			if (!knownButtons[spec]) {
				throw configError('Unknown button "' + spec + '".');
			}
			button = getKnownButton(spec);
		} else if (spec && typeof spec === 'object') {
			validateLabelPair(spec, 'Button');
			if (spec.use != null) {
				if (!knownButtons[spec.use]) {
					throw configError('Unknown button use "' + spec.use + '".');
				}
				button = assign({}, getKnownButton(spec.use), spec);
				delete button.use;
			} else {
				button = assign({}, spec);
			}
			if (hasOwn(spec, 'labelHtml')) delete button.label;
			if (hasOwn(spec, 'label')) delete button.labelHtml;
			validateLabelPair(button, 'Button');
		} else {
			throw configError('Button definitions must be strings or objects.');
		}

		if (!button.id) {
			throw configError('Every button must have an id.');
		}
		if (!hasOwn(button, 'value')) {
			button.value = button.id;
		}
		if (!hasOwn(button, 'intent')) {
			button.intent = 'secondary';
		}
		if (hasOwn(button, 'items') && button.split !== true) {
			throw configError('Button "' + button.id + '" supplies items but is not marked split.');
		}
		if (button.split === true) {
			if (!hasOwn(button, 'items')) button.items = [];
			if (!Array.isArray(button.items)) {
				throw configError('Button "' + button.id + '" items must be an array.');
			}
			button.items = normalizeDropdownItems(button.items, button.id);
		}
		return button;
	}

	function normalizeDropdownItems(items, parentId) {
		return items.map(function(item, index) {
			if (!item || typeof item !== 'object') {
				throw configError('Dropdown item at index ' + index + ' for button "' + parentId + '" must be an object.');
			}
			validateLabelPair(item, 'Dropdown item');
			if (!item.id) {
				throw configError('Dropdown item at index ' + index + ' for button "' + parentId + '" has no id.');
			}
			const normalized = assign({}, item);
			if (!hasOwn(normalized, 'value')) normalized.value = normalized.id;
			normalized._parentId = parentId;
			normalized._dropdownItem = true;
			return normalized;
		});
	}

	function getDialogString(key) {
		const langKey = languageKeys[key];
		if (langKey && window.lang && typeof window.lang[langKey] === 'string') {
			return window.lang[langKey];
		}
		return hasOwn(defaultStrings, key) ? defaultStrings[key] : key;
	}

	function formatString(template, values) {
		return ('' + template).replace(/\{([a-zA-Z0-9_]+)\}/g, function(match, key) {
			return hasOwn(values, key) ? values[key] : match;
		});
	}

	function getKnownButton(id) {
		return materializeKnownButton(knownButtons[id]);
	}

	function getKnownButtonsSnapshot() {
		const snapshot = {};
		Object.keys(knownButtons).forEach(function(id) {
			snapshot[id] = getKnownButton(id);
		});
		return snapshot;
	}

	function materializeKnownButton(button) {
		const materialized = clone(button);
		if (materialized._labelKey && !hasOwn(materialized, 'label') && !hasOwn(materialized, 'labelHtml')) {
			materialized.labelHtml = getDialogString(materialized._labelKey);
		}
		delete materialized._labelKey;
		return materialized;
	}

	function validateLabelPair(options, label) {
		if (hasOwn(options, 'label') && hasOwn(options, 'labelHtml')) {
			throw configError(label + ' label and labelHtml are mutually exclusive.');
		}
		if (hasOwn(options, 'text') || hasOwn(options, 'html')) {
			throw configError(label + ' must use label or labelHtml.');
		}
	}

	function indexButtons(buttons) {
		const map = {};
		buttons.forEach(function(button) {
			if (map[button.id]) {
				throw configError('Duplicate button id "' + button.id + '".');
			}
			map[button.id] = button;
			if (button.items) {
				button.items.forEach(function(item) {
					if (map[item.id]) {
						throw configError('Duplicate button or dropdown item id "' + item.id + '".');
					}
					map[item.id] = item;
				});
			}
		});
		return map;
	}
	//#endregion

	//#region Context and button controller
	function createContext(dialog) {
		const ctx = {
			state: dialog.options.state,
			options: dialog.options.raw,
			buttons: createButtonController(dialog),
			close: function(value) {
				return requestClose(dialog, value, { source: 'ctx.close' });
			},
			cancel: function() {
				const route = getCancelRoute(dialog);
				if (route) return ctx.buttons.trigger(route);
				return ctx.close(null);
			},
			setTitle: function(value) {
				setSlotContent(dialog.titleEl, value, false);
			},
			setSubtitle: function(value) {
				setSlotContent(dialog.subtitleEl, value, false);
				dialog.subtitleEl.hidden = value == null || value === '';
			},
			setBody: function(content) {
				setBodyContent(dialog, content, false);
			},
			setCloseButton: function(buttonId) {
				if (buttonId !== false) {
					validateButtonReference(dialog.options.buttonMap, buttonId, 'ctx.setCloseButton()');
				}
				dialog.hasCloseButtonOverride = true;
				dialog.closeButtonOverride = buttonId;
				if (!dialog.options.dismissal) return;
				dialog.options.dismissal.closeButton = buttonId;
				dialog.options.dismissal.esc = buttonId !== false
					&& resolveScalar(dialog.options.raw.esc, dialog.ctx, true) === true;
				updateCloseControl(dialog);
			},
			setProgress: function(value) {
				dialog.progressManual = true;
				setProgressValue(dialog, value, true);
			},
			setProgressColor: function(foreground, background) {
				setProgressColor(dialog, foreground, background);
			},
			setFooterStatus: function(value) {
				dialog.footerStatusManual = true;
				dialog.footerStatusContent = value;
				dialog.footerStatusIsHtml = false;
				renderFooterStatus(dialog);
			},
			setFooterStatusHtml: function(value) {
				dialog.footerStatusManual = true;
				dialog.footerStatusContent = value;
				dialog.footerStatusIsHtml = true;
				renderFooterStatus(dialog);
			},
			clearFooterStatus: function() {
				dialog.footerStatusManual = true;
				dialog.footerStatusContent = null;
				dialog.footerStatusIsHtml = false;
				renderFooterStatus(dialog);
			},
			setInitialFocus: function(target) {
				validateFocusTarget(target, 'initialFocus');
				dialog.hasInitialFocusOverride = true;
				dialog.initialFocusTarget = target;
			},
			setFocusAfterClose: function(target) {
				validateFocusTarget(target, 'focusAfterClose');
				dialog.hasFocusAfterCloseOverride = true;
				dialog.focusAfterCloseTarget = target;
			},
			on: function(eventName, handler) {
				return addLocalEvent(dialog, eventName, handler);
			},
			off: function(eventName, handler) {
				return removeLocalEvent(dialog, eventName, handler);
			}
		};

		ctx._refreshDialog = function() {
			renderTitleArea(dialog);
			setBodyContent(dialog, evaluateContentSlot(dialog.options.bodySlot, ctx), dialog.options.bodySlot.isHtml);
			if (!dialog.progressManual) {
				setProgressValue(dialog, resolveConfiguredProgress(dialog), false);
			}
			if (!dialog.footerStatusManual) {
				renderFooterStatus(dialog);
			}
			renderProgress(dialog);
			renderButtons(dialog);
			updateCloseControl(dialog);
			if (dialog.rendered) focusInitialElement(dialog);
		};
		ctx._setTitleHtml = function(value) {
			setSlotContent(dialog.titleEl, value, true);
		};
		ctx._setSubtitleHtml = function(value) {
			setSlotContent(dialog.subtitleEl, value, true);
			dialog.subtitleEl.hidden = value == null || value === '';
		};

		Object.defineProperty(ctx, '$dlg', {
			get: function() {
				if (!dialog.modalEl || !window.jQuery) return null;
				return window.jQuery(dialog.modalEl);
			}
		});
		Object.defineProperty(ctx, '_dialog', {
			value: dialog
		});

		return ctx;
	}

	function createButtonController(dialog) {
		return {
			get: function(id) {
				return dialog.options.buttonMap[id] || null;
			},
			add: function(buttonSpec) {
				const button = normalizeButtonSpec(buttonSpec);
				const nextButtons = dialog.options.buttons.concat([button]);
				const nextMap = indexButtons(nextButtons);
				dialog.options.buttons = nextButtons;
				dialog.options.buttonMap = nextMap;
				renderButtons(dialog);
				updateCloseControl(dialog);
				return button;
			},
			remove: function(id) {
				if (!dialog.options.buttonMap[id]) return;
				dialog.options.buttons = dialog.options.buttons.filter(function(button) {
					if (button.id === id) return false;
					if (button.items) {
						button.items = button.items.filter(function(item) {
							return item.id !== id;
						});
					}
					return true;
				});
				dialog.options.buttonMap = indexButtons(dialog.options.buttons);
				renderButtons(dialog);
				updateCloseControl(dialog);
			},
			update: function(id, patch) {
				const action = dialog.options.buttonMap[id];
				if (!action) {
					throw configError('Unknown button id "' + id + '".');
				}
				validateLabelPair(patch || {}, action._dropdownItem ? 'Dropdown item' : 'Button');
				if (patch && hasOwn(patch, 'id') && patch.id !== id) {
					throw configError('ctx.buttons.update() cannot change a button id.');
				}
				if (patch && hasOwn(patch, 'items')) {
					if (action._dropdownItem) {
						throw configError('Dropdown items cannot contain items.');
					}
					if (patch.split !== true && action.split !== true) {
						throw configError('Button "' + id + '" supplies items but is not marked split.');
					}
					patch = assign({}, patch);
					patch.items = normalizeDropdownItems(patch.items, id);
				}
				assign(action, patch || {});
				if (patch && hasOwn(patch, 'labelHtml')) delete action.label;
				if (patch && hasOwn(patch, 'label')) delete action.labelHtml;
				validateLabelPair(action, action._dropdownItem ? 'Dropdown item' : 'Button');
				dialog.options.buttonMap = indexButtons(dialog.options.buttons);
				renderButtons(dialog);
				updateCloseControl(dialog);
				return action;
			},
			enable: function(id) {
				this.update(id, { disabled: false });
			},
			disable: function(id) {
				this.update(id, { disabled: true });
			},
			show: function(id) {
				this.update(id, { hidden: false });
			},
			hide: function(id) {
				this.update(id, { hidden: true });
			},
			setLabel: function(id, label) {
				const action = this.get(id);
				if (!action) {
					throw configError('Unknown button id "' + id + '".');
				}
				delete action.labelHtml;
				action.label = label;
				renderButtons(dialog);
				updateCloseControl(dialog);
			},
			setIcon: function(id, icon) {
				const action = this.get(id);
				if (!action) {
					throw configError('Unknown button id "' + id + '".');
				}
				action.icon = icon;
				renderButtons(dialog);
				updateCloseControl(dialog);
			},
			setLoading: function(id, loading) {
				const action = this.get(id);
				if (!action) {
					throw configError('Unknown button id "' + id + '".');
				}
				action._loading = !!loading;
				renderButtons(dialog);
				updateCloseControl(dialog);
			},
			trigger: function(id) {
				return triggerButton(dialog, id);
			}
		};
	}
	//#endregion

	//#region Display and dismissal normalization
	function resolveDisplayOptions(normalized, ctx, openerDialog) {
		const raw = normalized.raw;
		const bodyChangedState = ctx.state;
		const size = resolveScalar(raw.size, ctx, 'md');
		const intent = resolveScalar(raw.intent, ctx, 'default');
		const placement = resolveScalar(raw.placement, ctx, openerDialog ? 'centered-parent' : 'top');
		const motion = resolveScalar(raw.motion, ctx, 'none');
		const backdrop = resolveScalar(raw.backdrop, ctx, true);
		const draggable = resolveScalar(raw.draggable, ctx, true);
		const allowResize = resolveScalar(raw.allowResize, ctx, true) !== false;
		const focusedOutlineColor = resolveScalar(raw.focusedOutlineColor, ctx, null);
		const headerBackgroundColor = resolveScalar(raw.headerBackgroundColor, ctx, null);
		const width = normalizeOptionalCssSize(resolveScalar(raw.width, ctx, null), 'width');
		const height = normalizeOptionalCssSize(resolveScalar(raw.height, ctx, null), 'height');
		const minWidth = normalizePixelDimension(resolveScalar(raw.minWidth, ctx, DEFAULT_MIN_WIDTH), 'minWidth');
		const minHeight = normalizePixelDimension(resolveScalar(raw.minHeight, ctx, DEFAULT_MIN_HEIGHT), 'minHeight');
		const fitToViewport = resolveScalar(raw.fitToViewport, ctx, true) !== false;
		const viewportMargin = normalizeViewportMargin(resolveScalar(raw.viewportMargin, ctx, 16));
		const customClass = normalizeCustomClass(resolveScalar(raw.customClass, ctx, null));
		const normalizedSize = normalizeSize(size);

		if (normalizedSize === 'fullscreen' && (width !== null || height !== null)) {
			throw configError('size "fullscreen" cannot be combined with width or height.');
		}

		return {
			size: normalizedSize,
			intent: normalizeIntent(intent),
			placement: normalizePlacement(placement),
			motion: normalizeMotion(motion),
			backdrop: backdrop !== false,
			draggable: draggable === true,
			allowResize: allowResize,
			focusedOutlineColor: normalizeOptionalCssColor(focusedOutlineColor, 'focusedOutlineColor'),
			headerBackgroundColor: normalizeOptionalCssColor(headerBackgroundColor, 'headerBackgroundColor'),
			width: width,
			height: height,
			minWidth: minWidth,
			minHeight: minHeight,
			fitToViewport: fitToViewport,
			viewportMargin: viewportMargin,
			customClass: customClass,
			state: bodyChangedState
		};
	}

	function resolveDismissalOptions(normalized, ctx) {
		const raw = normalized.raw;
		const closeButton = hasOwn(raw, 'closeButton')
			? resolveScalar(raw.closeButton, ctx, false)
			: chooseDefaultCloseButton(normalized.buttonMap);
		const esc = resolveScalar(raw.esc, ctx, true);
		const backdropClick = resolveScalar(raw.backdropClick, ctx, false);

		if (closeButton !== false) {
			validateButtonReference(normalized.buttonMap, closeButton, 'closeButton');
		}

		if (typeof backdropClick === 'string') {
			validateButtonReference(normalized.buttonMap, backdropClick, 'backdropClick');
		} else if (backdropClick !== false && typeof backdropClick !== 'function') {
			throw configError('backdropClick must be false, a button id, or a function.');
		}

		return {
			closeButton: closeButton,
			esc: closeButton !== false && esc === true,
			backdropClick: backdropClick
		};
	}

	function chooseDefaultCloseButton(buttonMap) {
		const ids = ['close', 'cancel', 'no'];
		for (let i = 0; i < ids.length; i++) {
			if (buttonMap[ids[i]]) return ids[i];
		}
		return false;
	}

	function validateButtonReference(buttonMap, id, optionName) {
		if (typeof id !== 'string' || !buttonMap[id]) {
			throw configError(optionName + ' references unknown button id "' + id + '".');
		}
	}

	function normalizeSize(size) {
		if (['sm', 'md', 'lg', 'xl', 'fullscreen'].indexOf(size) === -1) {
			return 'md';
		}
		return size;
	}

	function normalizeIntent(intent) {
		if (['default', 'primary', 'success', 'warning', 'danger', 'error', 'info'].indexOf(intent) === -1) {
			return 'default';
		}
		return intent;
	}

	function normalizePlacement(placement) {
		if (['top', 'center', 'centered-parent'].indexOf(placement) === -1) {
			return 'top';
		}
		return placement;
	}

	function normalizeMotion(motion) {
		if (['none', 'fade'].indexOf(motion) === -1) {
			return 'none';
		}
		return motion;
	}

	function normalizeOptionalCssSize(value, label) {
		if (value == null || value === '') return null;
		if (typeof value === 'number') {
			if (!isFinite(value) || value < 0) {
				throw configError(label + ' must be a finite non-negative number or valid CSS size string.');
			}
			return value + 'px';
		}
		if (typeof value !== 'string') {
			throw configError(label + ' must be a finite non-negative number or valid CSS size string.');
		}
		const trimmed = value.trim();
		if (trimmed === '' || !isValidCssSize(trimmed, label)) {
			throw configError(label + ' must be a valid CSS size string.');
		}
		return trimmed;
	}

	function isValidCssSize(value, label) {
		const property = label === 'height' ? 'height' : 'width';
		if (window.CSS && typeof window.CSS.supports === 'function') {
			return window.CSS.supports(property, value);
		}
		const test = document.createElement('div');
		test.style[property] = '';
		test.style[property] = value;
		return test.style[property] !== '';
	}

	function normalizePixelDimension(value, label) {
		if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
			throw configError(label + ' must be a finite positive number.');
		}
		return value;
	}

	function normalizeViewportMargin(value) {
		if (typeof value !== 'number' || !isFinite(value) || value < 0) {
			throw configError('viewportMargin must be a finite non-negative number.');
		}
		return value;
	}

	function normalizeCustomClass(value) {
		if (value == null || value === '') return null;
		if (typeof value !== 'string') {
			throw configError('customClass must be a string.');
		}
		const trimmed = value.trim();
		return trimmed === '' ? null : trimmed;
	}
	//#endregion

	//#region Rendering
	function renderShell(dialog) {
		const modal = document.createElement('div');
		const dialogClasses = ['modal', 'rc-dialog', 'rc-dialog-intent-' + dialog.options.display.intent];
		if (dialog.options.display.motion === 'fade') dialogClasses.push('fade');
		if (dialog.options.display.draggable) dialogClasses.push('rc-dialog-draggable-shell');
		if (dialog.options.display.allowResize) dialogClasses.push('rc-dialog-resizable');
		if (dialog.options.display.customClass) dialogClasses.push(dialog.options.display.customClass);
		modal.className = dialogClasses.join(' ');
		modal.id = dialog.id;
		modal.tabIndex = -1;
		modal.setAttribute('role', 'dialog');
		modal.setAttribute('aria-modal', 'true');
		if (dialog.options.display.focusedOutlineColor) {
			modal.style.setProperty('--rc-dialog-focused-outline-color', dialog.options.display.focusedOutlineColor);
		}
		if (dialog.options.display.headerBackgroundColor) {
			modal.style.setProperty('--rc-dialog-header-background-color', dialog.options.display.headerBackgroundColor);
		}

		const modalDialog = document.createElement('div');
		modalDialog.className = getModalDialogClass(dialog.options.display.size, dialog.options.display.placement, dialog.options.display.draggable);

		const content = document.createElement('div');
		content.className = 'modal-content rc-dialog-content';

		const header = document.createElement('div');
		header.className = 'modal-header rc-dialog-header';

		const headerRow = document.createElement('div');
		headerRow.className = 'rc-dialog-header-row';

		const titleArea = document.createElement('div');
		titleArea.className = 'rc-dialog-title-area';

		const icon = document.createElement('i');
		icon.className = 'rc-dialog-icon';
		icon.setAttribute('aria-hidden', 'true');

		const titleText = document.createElement('div');
		titleText.className = 'rc-dialog-title-text';

		const title = document.createElement('h5');
		title.className = 'modal-title rc-dialog-title';
		title.id = dialog.id + '-title';

		const subtitle = document.createElement('div');
		subtitle.className = 'rc-dialog-subtitle';
		subtitle.id = dialog.id + '-subtitle';

		const close = document.createElement('button');
		close.type = 'button';
		close.className = 'close rc-dialog-close';
		close.setAttribute('aria-label', stripHtml(getDialogString('close')) || defaultStrings.close);
		close.innerHTML = '<span aria-hidden="true">&times;</span>';

		const body = document.createElement('div');
		body.className = 'modal-body rc-dialog-body';
		body.id = dialog.id + '-body';

		const progressWrap = document.createElement('div');
		progressWrap.className = 'rc-dialog-progress-wrap';
		progressWrap.hidden = true;

		const progressOuter = document.createElement('div');
		progressOuter.className = 'progress rc-dialog-progress';
		progressOuter.setAttribute('role', 'progressbar');
		progressOuter.setAttribute('aria-valuemin', '0');
		progressOuter.setAttribute('aria-valuemax', '100');
		progressOuter.setAttribute('aria-valuenow', '0');

		const progressBar = document.createElement('div');
		progressBar.className = 'progress-bar rc-dialog-progress-bar';
		progressBar.style.width = '0%';

		const progressLabel = document.createElement('div');
		progressLabel.className = 'rc-dialog-page-label';
		progressLabel.hidden = true;

		const footer = document.createElement('div');
		footer.className = 'modal-footer rc-dialog-footer';

		const footerStatus = document.createElement('div');
		footerStatus.className = 'rc-dialog-footer-status';
		footerStatus.hidden = true;

		const footerActions = document.createElement('div');
		footerActions.className = 'rc-dialog-footer-actions';
		footerActions.hidden = true;

		titleText.appendChild(title);
		titleText.appendChild(subtitle);
		titleArea.appendChild(icon);
		titleArea.appendChild(titleText);
		headerRow.appendChild(titleArea);
		headerRow.appendChild(close);
		header.appendChild(headerRow);
		header.appendChild(progressLabel);
		progressOuter.appendChild(progressBar);
		progressWrap.appendChild(progressOuter);
		content.appendChild(header);
		content.appendChild(progressWrap);
		content.appendChild(body);
		footer.appendChild(footerStatus);
		footer.appendChild(footerActions);
		content.appendChild(footer);
		if (dialog.options.display.allowResize) {
			dialog.resizeHandles = createResizeHandles();
			content.appendChild(dialog.resizeHandles.bottom);
			content.appendChild(dialog.resizeHandles.right);
			content.appendChild(dialog.resizeHandles.corner);
			content.appendChild(dialog.resizeHandles.cornerMarker);
		}
		modalDialog.appendChild(content);
		modal.appendChild(modalDialog);

		modal.setAttribute('aria-labelledby', title.id);
		modal.setAttribute('aria-describedby', body.id);

		dialog.modalEl = modal;
		dialog.dialogEl = modalDialog;
		dialog.contentEl = content;
		dialog.headerEl = header;
		dialog.headerRowEl = headerRow;
		dialog.titleAreaEl = titleArea;
		dialog.iconEl = icon;
		dialog.titleEl = title;
		dialog.subtitleEl = subtitle;
		dialog.closeEl = close;
		dialog.progressWrapEl = progressWrap;
		dialog.progressLabelEl = progressLabel;
		dialog.progressOuterEl = progressOuter;
		dialog.progressBarEl = progressBar;
		dialog.bodyEl = body;
		dialog.footerEl = footer;
		dialog.footerStatusEl = footerStatus;
		dialog.footerActionsEl = footerActions;
		applyDialogDimensions(dialog);
	}

	function createResizeHandles() {
		const bottom = createResizeHandle('bottom', 'y');
		const right = createResizeHandle('right', 'x');
		const corner = createResizeHandle('corner', 'xy');
		const cornerMarker = document.createElement('span');
		cornerMarker.className = 'rc-dialog-resize-corner-marker';
		cornerMarker.setAttribute('aria-hidden', 'true');
		return {
			bottom: bottom,
			right: right,
			corner: corner,
			cornerMarker: cornerMarker
		};
	}

	function createResizeHandle(position, axis) {
		const handle = document.createElement('div');
		handle.className = 'rc-dialog-resize-handle rc-dialog-resize-' + position;
		handle.setAttribute('aria-hidden', 'true');
		handle.setAttribute('data-rc-dialog-resize-axis', axis);
		return handle;
	}

	function getModalDialogClass(size, placement, draggable) {
		const classes = ['modal-dialog', 'rc-dialog-dialog'];
		if (placement === 'center') classes.push('modal-dialog-centered');
		if (placement === 'centered-parent') classes.push('rc-dialog-centered-parent-pending');
		if (size === 'sm') classes.push('modal-sm');
		if (size === 'lg') classes.push('modal-lg');
		if (size === 'xl') classes.push('modal-xl');
		if (size === 'fullscreen') classes.push('modal-fullscreen', 'rc-dialog-fullscreen');
		if (draggable) classes.push('rc-dialog-draggable');
		return classes.join(' ');
	}

	function applyDialogDimensions(dialog) {
		const display = dialog.options.display;
		const viewportSpace = Math.max(0, display.viewportMargin * 2);
		const maxWidth = 'calc(100vw - ' + viewportSpace + 'px)';
		const maxHeight = 'calc(100vh - ' + viewportSpace + 'px)';

		dialog.dialogEl.style.minWidth = display.minWidth + 'px';
		dialog.contentEl.style.minHeight = display.minHeight + 'px';

		if (display.width) {
			dialog.dialogEl.style.width = display.width;
			dialog.dialogEl.style.maxWidth = display.fitToViewport ? maxWidth : 'none';
		}

		if (display.height) {
			dialog.contentEl.style.height = display.height;
		}

		if (display.fitToViewport && display.size !== 'fullscreen') {
			dialog.contentEl.style.maxHeight = maxHeight;
		}

		if (display.height || (display.fitToViewport && display.size !== 'fullscreen') || display.size === 'fullscreen') {
			applyConstrainedBodyLayout(dialog);
		}
	}

	function renderTitleArea(dialog) {
		const raw = dialog.options.raw;
		const ctx = dialog.ctx;
		const iconClass = resolveScalar(raw.icon, ctx, null);
		const titleSlot = getTitleSlot(dialog);
		const subtitleSlot = makeContentSlot(raw, 'subtitle', 'subtitleHtml');
		const title = resolveScalar(titleSlot.value, ctx, '');
		const subtitle = resolveScalar(subtitleSlot.value, ctx, '');

		dialog.iconEl.className = 'rc-dialog-icon ' + (iconClass || '');
		dialog.iconEl.hidden = !iconClass;

		setSlotContent(dialog.titleEl, title, titleSlot.isHtml);
		setSlotContent(dialog.subtitleEl, subtitle, subtitleSlot.isHtml);
		dialog.subtitleEl.hidden = subtitle == null || subtitle === '';
	}

	function getTitleSlot(dialog) {
		const raw = dialog.options.raw;
		if (hasOwn(raw, 'title') || hasOwn(raw, 'titleHtml')) {
			return makeContentSlot(raw, 'title', 'titleHtml');
		}
		if (dialog.options.display.intent === 'error') {
			return { value: getDialogString('errorTitle'), isHtml: false };
		}
		if (dialog.options.display.intent === 'danger') {
			return { value: getDialogString('noticeTitle'), isHtml: false };
		}
		return { value: '', isHtml: false };
	}

	function renderButtons(dialog) {
		if (!dialog.footerActionsEl) return;
		if (dialog.footerPointerActive) {
			dialog.buttonRenderPending = true;
			return;
		}
		dialog.buttonRenderPending = false;

		while (dialog.footerActionsEl.firstChild) dialog.footerActionsEl.removeChild(dialog.footerActionsEl.firstChild);
		dialog.buttonElements = {};
		dialog.buttonContainers = {};

		dialog.options.buttons.forEach(function(button) {
			dialog.footerActionsEl.appendChild(renderFooterButton(dialog, button));
		});

		dialog.footerActionsEl.hidden = dialog.options.buttons.length === 0;
		updateFooterVisibility(dialog);
	}

	function renderFooterButton(dialog, button) {
		const resolved = resolveButton(button, dialog.ctx, dialog.options.display.intent);
		if (resolved.split === true) {
			return renderSplitButton(dialog, button, resolved);
		}
		return renderPlainButton(dialog, button, resolved);
	}

	function renderPlainButton(dialog, button, resolved) {
		const el = document.createElement('button');
		el.type = 'button';
		el.className = getButtonClass(resolved);
		el.disabled = resolved.disabled || resolved.loading;
		el.hidden = resolved.hidden;
		el.setAttribute('data-rc-dialog-button-id', button.id);
		el.setAttribute('data-rc-dialog-intent', resolved.intent);
		el.addEventListener('click', function(event) {
			event.preventDefault();
			dialog.ctx.buttons.trigger(button.id);
		});
		setButtonFace(el, resolved);
		dialog.buttonElements[button.id] = el;
		dialog.buttonContainers[button.id] = el;
		return el;
	}

	function renderSplitButton(dialog, button, resolved) {
		const group = document.createElement('div');
		group.className = 'btn-group rc-dialog-split-button';
		group.setAttribute('role', 'group');
		group.setAttribute('aria-label', formatString(getDialogString('splitDropdownActions'), {
			label: getPlainActionLabel(resolved)
		}));
		group.hidden = resolved.hidden;
		group.setAttribute('data-rc-dialog-button-id', button.id);

		const main = document.createElement('button');
		main.type = 'button';
		main.className = getButtonClass(resolved);
		main.disabled = resolved.disabled || resolved.loading;
		main.setAttribute('data-rc-dialog-button-id', button.id);
		main.setAttribute('data-rc-dialog-intent', resolved.intent);
		main.addEventListener('click', function(event) {
			event.preventDefault();
			dialog.ctx.buttons.trigger(button.id);
		});
		setButtonFace(main, resolved);

		const dropdownGroup = document.createElement('div');
		dropdownGroup.className = 'btn-group rc-dialog-split-dropdown';
		dropdownGroup.setAttribute('role', 'group');

		const toggle = document.createElement('button');
		toggle.type = 'button';
		toggle.className = getButtonClass(resolved) + ' dropdown-toggle rc-dialog-split-toggle';
		toggle.disabled = resolved.disabled || resolved.loading;
		toggle.setAttribute('data-bs-toggle', 'dropdown');
		toggle.setAttribute('aria-expanded', 'false');
		const toggleLabel = document.createElement('span');
		toggleLabel.className = 'visually-hidden';
		toggleLabel.textContent = getDialogString('splitDropdownToggle');
		toggle.appendChild(toggleLabel);

		const menu = document.createElement('ul');
		menu.className = 'dropdown-menu rc-dialog-split-menu';

		(button.items || []).forEach(function(item) {
			const itemEl = renderDropdownItem(dialog, item);
			if (itemEl) menu.appendChild(itemEl);
		});

		dropdownGroup.appendChild(toggle);
		dropdownGroup.appendChild(menu);
		group.appendChild(main);
		group.appendChild(dropdownGroup);
		dialog.buttonElements[button.id] = main;
		dialog.buttonContainers[button.id] = group;
		return group;
	}

	function renderDropdownItem(dialog, item) {
		const resolved = resolveButton(item, dialog.ctx, dialog.options.display.intent);
		if (resolved.hidden) return null;

		const itemWrap = document.createElement('li');
		const el = document.createElement('button');
		el.type = 'button';
		el.className = getDropdownItemClass(resolved);
		el.disabled = resolved.disabled || resolved.loading;
		el.setAttribute('data-rc-dialog-button-id', item.id);
		el.addEventListener('click', function(event) {
			event.preventDefault();
			dialog.ctx.buttons.trigger(item.id);
		});
		setButtonFace(el, resolved);
		dialog.buttonElements[item.id] = el;
		itemWrap.appendChild(el);
		return itemWrap;
	}

	function resolveButton(button, ctx, dialogIntent) {
		const resolved = {};
		Object.keys(button).forEach(function(key) {
			if (key.charAt(0) === '_') return;
			if (key === 'onClick') return;
			resolved[key] = resolveScalar(button[key], ctx, button[key]);
		});
		resolved.id = button.id;
		resolved.intent = resolved.intent || dialogIntent || 'secondary';
		if (resolved.intent === 'default') resolved.intent = 'secondary';
		resolved.disabled = resolved.disabled === true;
		resolved.hidden = resolved.hidden === true;
		resolved.loading = button._loading === true;
		return resolved;
	}

	function getButtonClass(button) {
		const classes = ['btn', 'btn-sm', 'rc-dialog-button'];
		const className = button.className || '';
		const intent = button.intent || 'secondary';

		if (intent === 'primary') classes.push('btn-primaryrc', 'btn-primary');
		else if (intent === 'danger' || intent === 'error') classes.push('btn-danger');
		else if (intent === 'success') classes.push('btn-success');
		else if (intent === 'warning') classes.push('btn-warning');
		else if (intent === 'info') classes.push('btn-info');
		else classes.push('btn-defaultrc', 'btn-light');

		if (className) classes.push(className);
		if (button.loading) classes.push('rc-dialog-button-loading');
		return classes.join(' ');
	}

	function getDropdownItemClass(item) {
		const classes = ['dropdown-item', 'rc-dialog-dropdown-item'];
		if (item.className) classes.push(item.className);
		if (item.loading) classes.push('rc-dialog-button-loading');
		return classes.join(' ');
	}

	function setButtonFace(el, button) {
		while (el.firstChild) el.removeChild(el.firstChild);
		if (button.loading) {
			const spinner = document.createElement('span');
			spinner.className = 'rc-dialog-spinner';
			spinner.setAttribute('aria-hidden', 'true');
			el.appendChild(spinner);
		}
		if (button.icon && !button.loading) {
			const icon = document.createElement('i');
			icon.className = 'rc-dialog-button-icon ' + button.icon;
			icon.setAttribute('aria-hidden', 'true');
			el.appendChild(icon);
		}

		const labelIsHtml = hasOwn(button, 'labelHtml');
		const label = labelIsHtml ? button.labelHtml : (hasOwn(button, 'label') ? button.label : button.id);
		if (labelIsHtml) {
			appendContent(el, label, true);
		} else {
			el.appendChild(document.createTextNode('' + label));
		}
	}

	function getPlainActionLabel(button) {
		const label = hasOwn(button, 'label') ? button.label : (hasOwn(button, 'labelHtml') ? stripHtml(button.labelHtml) : button.id);
		if (label == null) return button.id;
		return stripHtml('' + label) || button.id;
	}

	function updateCloseControl(dialog) {
		if (!dialog.closeEl) return;

		const closeButtonId = dialog.options.dismissal.closeButton;
		if (closeButtonId === false) {
			dialog.closeEl.hidden = true;
			dialog.closeEl.disabled = true;
			return;
		}

		const button = dialog.options.buttonMap[closeButtonId];
		if (!button) {
			dialog.closeEl.hidden = true;
			dialog.closeEl.disabled = true;
			return;
		}

		const resolved = resolveButton(button, dialog.ctx, dialog.options.display.intent);
		dialog.closeEl.hidden = resolved.hidden;
		dialog.closeEl.disabled = resolved.disabled || resolved.loading;
	}
	//#endregion

	//#region Dialog events and result flow
	function attachDialogEvents(dialog) {
		dialog.closeEl.addEventListener('click', function(event) {
			event.preventDefault();
			const route = dialog.options.dismissal.closeButton;
			if (route !== false) dialog.ctx.buttons.trigger(route);
		});

		dialog.modalEl.addEventListener('mousedown', function(event) {
			markDialogInteraction(dialog);
			dialog._mouseDownOnBackdrop = event.target === dialog.modalEl;
			if (getFooterActionForEvent(dialog, event)) holdFooterButtonsForPointer(dialog);
		});

		dialog.modalEl.addEventListener('pointerdown', function(event) {
			if (getFooterActionForEvent(dialog, event)) holdFooterButtonsForPointer(dialog);
		});

		dialog.modalEl.addEventListener('focusin', function() {
			markDialogInteraction(dialog);
		});

		dialog.modalEl.addEventListener('click', function(event) {
			if (dialog.footerPointerActive && getFooterActionForEvent(dialog, event)) {
				releaseFooterButtonsForPointer(dialog);
			}
			if (event.target !== dialog.modalEl || !dialog._mouseDownOnBackdrop) return;
			handleBackdropClick(dialog, event);
		});

		const keydownHandler = function(event) {
			if (!isTopDialog(dialog)) return;
			markDialogInteraction(dialog);
			if (event.key !== 'Escape' && event.keyCode !== 27) return;
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}
			if (!dialog.options.dismissal.esc) return;
			dialog.ctx.buttons.trigger(dialog.options.dismissal.closeButton);
		};
		const escapeFollowupHandler = function(event) {
			if (!isTopDialog(dialog)) return;
			if (event.key !== 'Escape' && event.keyCode !== 27) return;
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}
		};
		// Listen at the document capture phase so an underlying jQuery UI dialog
		// cannot receive Escape, even if it retained the focused element.
		document.addEventListener('keydown', keydownHandler, true);
		// Some legacy dialogs react to Escape on keypress or keyup. Suppress those
		// follow-up events at the same level after the rcDialog handles keydown.
		document.addEventListener('keypress', escapeFollowupHandler, true);
		document.addEventListener('keyup', escapeFollowupHandler, true);
		dialog.cleanups.push(function() {
			document.removeEventListener('keydown', keydownHandler, true);
			document.removeEventListener('keypress', escapeFollowupHandler, true);
			document.removeEventListener('keyup', escapeFollowupHandler, true);
			clearFooterPointerReleaseListeners(dialog);
		});

	}

	function getFooterActionForEvent(dialog, event) {
		if (!dialog.footerActionsEl || !event.target || typeof event.target.closest !== 'function') return null;
		const action = event.target.closest('[data-rc-dialog-button-id]');
		return action && dialog.footerActionsEl.contains(action) ? action : null;
	}

	function holdFooterButtonsForPointer(dialog) {
		if (dialog.footerPointerActive) return;
		dialog.footerPointerActive = true;
		const release = function() {
			setTimeout(function() {
				releaseFooterButtonsForPointer(dialog);
			}, 0);
		};
		dialog._footerPointerRelease = release;
		document.addEventListener('pointerup', release, true);
		document.addEventListener('pointercancel', release, true);
		document.addEventListener('mouseup', release, true);
	}

	function clearFooterPointerReleaseListeners(dialog) {
		const release = dialog._footerPointerRelease;
		if (!release) return;
		document.removeEventListener('pointerup', release, true);
		document.removeEventListener('pointercancel', release, true);
		document.removeEventListener('mouseup', release, true);
		dialog._footerPointerRelease = null;
	}

	function releaseFooterButtonsForPointer(dialog) {
		if (!dialog.footerPointerActive) return;
		dialog.footerPointerActive = false;
		clearFooterPointerReleaseListeners(dialog);
		if (!dialog.buttonRenderPending || dialog.closed || dialog.closing) return;
		renderButtons(dialog);
		updateCloseControl(dialog);
	}

	function usesParentBackdrop(dialog) {
		return !!(isDialogUsableAsOpener(dialog.openerDialog) && dialog.options.display.backdrop);
	}

	function installParentBackdrop(dialog) {
		if (!usesParentBackdrop(dialog)) return;

		const backdrop = document.createElement('div');
		backdrop.className = 'rc-dialog-parent-backdrop';
		backdrop.setAttribute('aria-hidden', 'true');
		dialog.parentBackdropEl = backdrop;
		updateParentBackdrop(dialog);
		document.body.appendChild(backdrop);

		const onResize = function() {
			updateParentBackdrop(dialog);
		};
		window.addEventListener('resize', onResize);
		dialog.cleanups.push(function() {
			window.removeEventListener('resize', onResize);
			if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
		});
	}

	function registerChildDialog(dialog) {
		const opener = dialog.openerDialog;
		if (!isDialogUsableAsOpener(opener) || dialog.childRegistered) return;

		opener.childDialogCount = (opener.childDialogCount || 0) + 1;
		pinDialogForChild(opener);
		dialog.childRegistered = true;
	}

	function unregisterChildDialog(dialog) {
		const opener = dialog.openerDialog;
		if (!opener || !dialog.childRegistered) return;

		dialog.childRegistered = false;
		opener.childDialogCount = Math.max(0, (opener.childDialogCount || 0) - 1);
		if (opener.childDialogCount === 0) {
			unpinDialogForChild(opener);
		}
	}

	function pinDialogForChild(dialog) {
		const target = dialog && dialog.dialogEl;
		if (!target || dialog.childPositionPin) return;

		const rect = target.getBoundingClientRect();
		dialog.childPositionPin = {
			position: target.style.position,
			margin: target.style.margin,
			minHeight: target.style.minHeight,
			display: target.style.display,
			alignItems: target.style.alignItems,
			transform: target.style.transform,
			width: target.style.width,
			maxWidth: target.style.maxWidth,
			left: target.style.left,
			top: target.style.top,
			modalScrollLeft: dialog.modalEl ? dialog.modalEl.scrollLeft : 0,
			modalScrollTop: dialog.modalEl ? dialog.modalEl.scrollTop : 0,
			hadCenteredClass: target.classList.contains('modal-dialog-centered')
		};

		target.classList.remove('modal-dialog-centered');
		target.style.position = 'fixed';
		target.style.margin = '0';
		target.style.minHeight = '0';
		target.style.display = 'block';
		target.style.alignItems = 'stretch';
		target.style.transform = 'none';
		target.style.width = rect.width + 'px';
		target.style.maxWidth = 'none';
		target.style.left = rect.left + 'px';
		target.style.top = rect.top + 'px';
	}

	function unpinDialogForChild(dialog) {
		const target = dialog && dialog.dialogEl;
		const pin = dialog && dialog.childPositionPin;
		if (!target || !pin) return;

		if (dialog.modalEl) {
			dialog.modalEl.scrollLeft = pin.modalScrollLeft || 0;
			dialog.modalEl.scrollTop = pin.modalScrollTop || 0;
		}
		target.style.position = pin.position;
		target.style.margin = pin.margin;
		target.style.minHeight = pin.minHeight;
		target.style.display = pin.display;
		target.style.alignItems = pin.alignItems;
		target.style.transform = pin.transform;
		target.style.width = pin.width;
		target.style.maxWidth = pin.maxWidth;
		target.style.left = pin.left;
		target.style.top = pin.top;
		if (pin.hadCenteredClass) {
			target.classList.add('modal-dialog-centered');
		} else {
			target.classList.remove('modal-dialog-centered');
		}
		dialog.childPositionPin = null;
	}

	function updateParentBackdrop(dialog) {
		if (!dialog.parentBackdropEl) return;
		const parentRect = getOpenerDialogRect(dialog);
		if (!parentRect) {
			dialog.parentBackdropEl.hidden = true;
			return;
		}

		dialog.parentBackdropEl.hidden = false;
		dialog.parentBackdropEl.style.left = parentRect.left + 'px';
		dialog.parentBackdropEl.style.top = parentRect.top + 'px';
		dialog.parentBackdropEl.style.width = parentRect.width + 'px';
		dialog.parentBackdropEl.style.height = parentRect.height + 'px';

		const openerContent = dialog.openerDialog && dialog.openerDialog.contentEl;
		if (openerContent && window.getComputedStyle) {
			dialog.parentBackdropEl.style.borderRadius = window.getComputedStyle(openerContent).borderRadius;
		}
	}

	function getOpenerDialogRect(dialog) {
		const opener = dialog.openerDialog;
		if (!isDialogUsableAsOpener(opener)) return null;
		const el = opener.contentEl || opener.dialogEl;
		if (!el) return null;
		return el.getBoundingClientRect();
	}

	function handleBackdropClick(dialog, event) {
		const route = dialog.options.dismissal.backdropClick;
		if (route === false || !dialog.options.display.backdrop) return;
		if (dialog.parentBackdropEl && !isPointInParentBackdrop(dialog, event)) return;
		event.preventDefault();
		if (typeof route === 'string') {
			dialog.ctx.buttons.trigger(route);
		} else if (typeof route === 'function') {
			try {
				route(dialog.ctx);
			} catch (error) {
				logError(error);
			}
		}
	}

	function isPointInParentBackdrop(dialog, event) {
		const rect = dialog.parentBackdropEl.getBoundingClientRect();
		return event.clientX >= rect.left
			&& event.clientX <= rect.right
			&& event.clientY >= rect.top
			&& event.clientY <= rect.bottom;
	}

	function triggerButton(dialog, id) {
		const action = dialog.options.buttonMap[id];
		if (!action) {
			throw configError('Unknown button id "' + id + '".');
		}
		const resolved = resolveButton(action, dialog.ctx, dialog.options.display.intent);
		if (resolved.disabled || resolved.hidden || resolved.loading || dialog.closing || dialog.closed) {
			return Promise.resolve(false);
		}

		const closeVersionBefore = dialog.closeVersion;
		let actionResult;
		try {
			actionResult = runButtonAction(dialog, id, action, resolved, closeVersionBefore);
		} catch (error) {
			logError(error);
			return Promise.resolve(false);
		}

		if (isPromiseLike(actionResult)) {
			dialog.ctx.buttons.setLoading(id, true);
			return Promise.resolve(actionResult)
				.then(function(result) {
					if (!dialog.closed && !dialog.closing) dialog.ctx.buttons.setLoading(id, false);
					return completeButtonTrigger(dialog, action, result, closeVersionBefore);
				})
				.catch(function(error) {
					if (!dialog.closed && !dialog.closing) dialog.ctx.buttons.setLoading(id, false);
					logError(error);
					return false;
				});
		}

		return Promise.resolve(completeButtonTrigger(dialog, action, actionResult, closeVersionBefore));
	}

	function runButtonAction(dialog, id, action, resolved, closeVersionBefore) {
		const eventResult = emitLocalEvent(dialog, 'button:' + id, {
			id: id,
			action: resolved,
			button: resolved
		}, closeVersionBefore);

		if (isPromiseLike(eventResult)) {
			return Promise.resolve(eventResult).then(function(result) {
				if (result.handled) return result.value;
				return undefined;
			});
		}

		if (eventResult.handled) return eventResult.value;
		return undefined;
	}

	function emitLocalEvent(dialog, eventName, event, closeVersionBefore) {
		event = makeLocalEvent(dialog, eventName, event);
		const handlers = dialog.events && dialog.events[eventName] ? dialog.events[eventName].slice() : [];
		if (handlers.length === 0) {
			return { handled: false, value: undefined };
		}

		for (let i = 0; i < handlers.length; i++) {
			const result = handlers[i](event);
			if (isPromiseLike(result)) {
				return continueAsyncLocalEventHandlers(dialog, handlers, i, result, event, closeVersionBefore);
			}
			if (typeof closeVersionBefore === 'number' && dialog.closeVersion !== closeVersionBefore) {
				return { handled: true, value: undefined };
			}
			if (typeof result !== 'undefined') {
				return { handled: true, value: result };
			}
		}

		return { handled: false, value: undefined };
	}

	function continueAsyncLocalEventHandlers(dialog, handlers, currentIndex, currentResult, event, closeVersionBefore) {
		return Promise.resolve(currentResult).then(function(resolvedResult) {
			if (typeof closeVersionBefore === 'number' && dialog.closeVersion !== closeVersionBefore) {
				return { handled: true, value: undefined };
			}
			if (typeof resolvedResult !== 'undefined') {
				return { handled: true, value: resolvedResult };
			}
			for (let i = currentIndex + 1; i < handlers.length; i++) {
				const result = handlers[i](event);
				if (isPromiseLike(result)) {
					return continueAsyncLocalEventHandlers(dialog, handlers, i, result, event, closeVersionBefore);
				}
				if (typeof closeVersionBefore === 'number' && dialog.closeVersion !== closeVersionBefore) {
					return { handled: true, value: undefined };
				}
				if (typeof result !== 'undefined') {
					return { handled: true, value: result };
				}
			}
			return { handled: false, value: undefined };
		});
	}

	function makeLocalEvent(dialog, eventName, event) {
		const normalized = assign({}, event || {});
		normalized.type = eventName;
		normalized.ctx = dialog.ctx;
		return normalized;
	}

	function notifyLocalEvent(dialog, eventName, event) {
		try {
			const result = emitLocalEvent(dialog, eventName, event);
			if (isPromiseLike(result)) {
				Promise.resolve(result).catch(logError);
			}
		} catch (error) {
			logError(error);
		}
	}

	function emitVetoLocalEvent(dialog, eventName, event, closeVersionBefore) {
		event = makeLocalEvent(dialog, eventName, event);
		const handlers = dialog.events && dialog.events[eventName] ? dialog.events[eventName].slice() : [];
		if (handlers.length === 0) {
			return { handled: false, value: undefined };
		}
		for (let i = 0; i < handlers.length; i++) {
			const result = handlers[i](event);
			if (isPromiseLike(result)) {
				return continueAsyncVetoLocalEventHandlers(dialog, handlers, i, result, event, closeVersionBefore);
			}
			if (typeof closeVersionBefore === 'number' && dialog.closeVersion !== closeVersionBefore) {
				return { handled: true, value: false };
			}
			if (result === false) {
				return { handled: true, value: false };
			}
		}
		return { handled: false, value: undefined };
	}

	function continueAsyncVetoLocalEventHandlers(dialog, handlers, currentIndex, currentResult, event, closeVersionBefore) {
		return Promise.resolve(currentResult).then(function(resolvedResult) {
			if (typeof closeVersionBefore === 'number' && dialog.closeVersion !== closeVersionBefore) {
				return { handled: true, value: false };
			}
			if (resolvedResult === false) {
				return { handled: true, value: false };
			}
			for (let i = currentIndex + 1; i < handlers.length; i++) {
				const result = handlers[i](event);
				if (isPromiseLike(result)) {
					return continueAsyncVetoLocalEventHandlers(dialog, handlers, i, result, event, closeVersionBefore);
				}
				if (typeof closeVersionBefore === 'number' && dialog.closeVersion !== closeVersionBefore) {
					return { handled: true, value: false };
				}
				if (result === false) {
					return { handled: true, value: false };
				}
			}
			return { handled: false, value: undefined };
		});
	}

	function completeButtonTrigger(dialog, button, clickResult, closeVersionBefore) {
		if (dialog.closeVersion !== closeVersionBefore) {
			return true;
		}
		if (clickResult === false) {
			return false;
		}
		if (typeof clickResult !== 'undefined') {
			return requestClose(dialog, clickResult, { source: 'button', button: button });
		}
		return requestClose(dialog, resolveScalar(button.value, dialog.ctx, button.value), { source: 'button', button: button });
	}

	function requestClose(dialog, value, meta) {
		if (dialog.closed || dialog.closing) {
			return Promise.resolve(false);
		}

		dialog.closeVersion++;
		dialog.closing = true;

		let beforeCloseResult;
		try {
			beforeCloseResult = emitVetoLocalEvent(dialog, 'dialog:beforeClose', {
				value: value,
				meta: meta || {}
			}, dialog.closeVersion);
		} catch (error) {
			dialog.closing = false;
			logError(error);
			return Promise.resolve(false);
		}

		return Promise.resolve(beforeCloseResult)
			.then(function(result) {
				if (result.handled && result.value === false) {
					dialog.closing = false;
					return false;
				}
				dialog.hasResult = true;
				dialog.resultValue = value;
				dialog.modalController.hide();
				return true;
			})
			.catch(function(error) {
				dialog.closing = false;
				logError(error);
				return false;
			});
	}

	function finalizeDialog(dialog, returnFocusElement) {
		if (dialog.closed) return;
		dialog.closed = true;
		dialog.closing = false;

		unregisterChildDialog(dialog);

		removeFromActiveDialogs(dialog);
		if (lastInteractionDialog === dialog) {
			lastInteractionDialog = null;
			lastInteractionTime = 0;
		}
		dialog.cleanups.forEach(function(cleanup) {
			try {
				cleanup();
			} catch (error) {
				logError(error);
			}
		});
		dialog.cleanups = [];

		if (!dialog.hasResult) {
			dialog.resultValue = null;
			dialog.hasResult = true;
		}

		notifyLocalEvent(dialog, 'dialog:hidden', {
			result: dialog.resultValue
		});

		if (dialog.modalController) {
			dialog.modalController.dispose();
		}
		if (dialog.modalEl && dialog.modalEl.parentNode) {
			dialog.modalEl.parentNode.removeChild(dialog.modalEl);
		}
		try {
			restoreFocus(resolveFocusAfterClose(dialog, returnFocusElement));
		} catch (error) {
			logError(error);
			restoreFocus(returnFocusElement);
		}
		dialog.resolve(dialog.resultValue);
	}

	function getCancelRoute(dialog) {
		const route = dialog.options.dismissal.closeButton;
		if (route !== false) return route;
		return chooseDefaultCloseButton(dialog.options.buttonMap);
	}
	//#endregion

	//#region Content, footer, and progress
	function evaluateContentSlot(slot, ctx) {
		return resolveScalar(slot.value, ctx, slot.value);
	}

	function setBodyContent(dialog, content, isHtml) {
		if (!dialog.bodyEl) return;
		setSlotContent(dialog.bodyEl, content, isHtml);
		syncBodyLayoutMode(dialog);
	}

	function applyConstrainedBodyLayout(dialog) {
		if (!dialog.contentEl || !dialog.bodyEl) return;
		dialog.bodyLayoutConstrained = true;
		dialog.contentEl.style.display = 'flex';
		dialog.contentEl.style.flexDirection = 'column';
		dialog.bodyEl.style.flex = '1 1 auto';
		dialog.bodyEl.style.minHeight = '0';
		syncBodyLayoutMode(dialog);
	}

	function syncBodyLayoutMode(dialog) {
		if (!dialog.bodyEl) return;
		const isTabbedBody = isCurrentBodyTabbed(dialog);
		dialog.bodyEl.classList.toggle('rc-dialog-body-tabbed', isTabbedBody);
		if (!isDialogBodyConstrained(dialog)) return;
		dialog.bodyEl.style.display = isTabbedBody ? 'flex' : '';
		dialog.bodyEl.style.flexDirection = isTabbedBody ? 'column' : '';
		dialog.bodyEl.style.overflow = isTabbedBody ? 'hidden' : 'auto';
	}

	function isCurrentBodyTabbed(dialog) {
		const firstElement = dialog.bodyEl && dialog.bodyEl.firstElementChild;
		return !!(firstElement && firstElement.classList && firstElement.classList.contains('rc-dialog-tabs'));
	}

	function isDialogBodyConstrained(dialog) {
		const display = dialog.options && dialog.options.display;
		return !!(dialog.bodyLayoutConstrained || (display && (display.height || (display.fitToViewport && display.size !== 'fullscreen') || display.size === 'fullscreen')));
	}

	function renderFooterStatus(dialog) {
		if (!dialog.footerStatusEl) return;
		if (dialog.footerStatusManual) {
			setFooterStatusContent(dialog, dialog.footerStatusContent, dialog.footerStatusIsHtml);
			return;
		}
		setFooterStatusContent(
			dialog,
			evaluateContentSlot(dialog.options.footerStatusSlot, dialog.ctx),
			dialog.options.footerStatusSlot.isHtml
		);
	}

	function setFooterStatusContent(dialog, content, isHtml) {
		if (!dialog.footerStatusEl) return;
		setSlotContent(dialog.footerStatusEl, content, isHtml);
		dialog.footerStatusEl.hidden = isEmptyFooterStatus(content);
		updateFooterVisibility(dialog);
	}

	function isEmptyFooterStatus(content) {
		if (content == null || content === '') return true;
		if (Array.isArray(content) && content.length === 0) return true;
		if (isJQueryObject(content) && content.length === 0) return true;
		if (isNode(content) && content.nodeType === 11 && !content.firstChild) return true;
		return false;
	}

	function updateFooterVisibility(dialog) {
		if (!dialog.footerEl) return;
		const hasStatus = dialog.footerStatusEl && !dialog.footerStatusEl.hidden;
		const hasActions = dialog.footerActionsEl && !dialog.footerActionsEl.hidden;
		dialog.footerEl.hidden = !hasStatus && !hasActions;
	}

	function resolveConfiguredProgress(dialog) {
		if (!dialog.options.hasProgressOption) return null;
		return resolveScalar(dialog.options.raw.progress, dialog.ctx, null);
	}

	function resolveConfiguredProgressLabel(dialog) {
		if (!hasOwn(dialog.options.raw, '__rcDialogProgressLabel')) return null;
		return resolveScalar(dialog.options.raw.__rcDialogProgressLabel, dialog.ctx, null);
	}

	function setProgressValue(dialog, value, renderNow) {
		dialog.progressValue = normalizeProgressValue(value);
		if (renderNow) renderProgress(dialog);
	}

	function setProgressColor(dialog, foreground, background) {
		dialog.progressForegroundColor = normalizeCssColor(foreground, 'progress foreground color');
		if (typeof background !== 'undefined') {
			dialog.progressBackgroundColor = normalizeCssColor(background, 'progress background color');
		}
		applyProgressColor(dialog);
	}

	function normalizeCssColor(value, label) {
		if (typeof value !== 'string' || value.trim() === '' || !isValidCssColor(value)) {
			throw configError(label + ' must be a valid CSS color.');
		}
		return value;
	}

	function normalizeOptionalCssColor(value, label) {
		if (value == null) return null;
		return normalizeCssColor(value, label);
	}

	function isValidCssColor(value) {
		if (window.CSS && typeof window.CSS.supports === 'function') {
			return window.CSS.supports('color', value);
		}
		const test = document.createElement('span');
		test.style.color = '';
		test.style.color = value;
		return test.style.color !== '';
	}

	function normalizeProgressValue(value) {
		if (value == null) return null;
		if (typeof value !== 'number' || !isFinite(value)) {
			throw configError('progress must be null or a finite number.');
		}
		return clamp(value, 0, 1000);
	}

	function renderProgress(dialog) {
		if (!dialog.progressWrapEl || !dialog.progressBarEl) return;
		applyProgressColor(dialog);
		renderProgressLabel(dialog);
		const value = dialog.progressValue;
		if (value == null) {
			dialog.progressWrapEl.hidden = true;
			dialog.progressOuterEl.hidden = true;
			dialog.progressBarEl.style.width = '0%';
			dialog.progressOuterEl.setAttribute('aria-valuenow', '0');
			return;
		}
		const percent = value / 10;
		dialog.progressWrapEl.hidden = false;
		dialog.progressOuterEl.hidden = false;
		dialog.progressBarEl.style.width = percent + '%';
		dialog.progressOuterEl.setAttribute('aria-valuenow', '' + Math.round(percent));
	}

	function renderProgressLabel(dialog) {
		if (!dialog.progressLabelEl) return false;
		const label = resolveConfiguredProgressLabel(dialog);
		if (label == null || label === '') {
			dialog.progressLabelEl.hidden = true;
			dialog.progressLabelEl.textContent = '';
			return false;
		}
		dialog.progressLabelEl.hidden = false;
		dialog.progressLabelEl.textContent = '' + label;
		return true;
	}

	function applyProgressColor(dialog) {
		if (!dialog.progressOuterEl || !dialog.progressBarEl) return;
		dialog.progressBarEl.style.backgroundColor = dialog.progressForegroundColor || '';
		dialog.progressOuterEl.style.backgroundColor = dialog.progressBackgroundColor || '';
	}

	function setSlotContent(el, content, isHtml) {
		if (!el) return;
		while (el.firstChild) el.removeChild(el.firstChild);
		if (content == null) return;

		if (isJQueryObject(content)) {
			for (let i = 0; i < content.length; i++) {
				el.appendChild(content[i].cloneNode(true));
			}
			return;
		}

		if (isNode(content)) {
			el.appendChild(content);
			return;
		}

		if (Array.isArray(content)) {
			content.forEach(function(item) {
				appendContent(el, item, isHtml);
			});
			return;
		}

		if (isHtml) {
			el.innerHTML = '' + content;
		} else {
			el.textContent = '' + content;
		}
	}

	function appendContent(el, content, isHtml) {
		if (content == null) return;
		if (isNode(content)) {
			el.appendChild(content);
		} else if (isJQueryObject(content)) {
			for (let i = 0; i < content.length; i++) {
				el.appendChild(content[i].cloneNode(true));
			}
		} else if (isHtml) {
			const wrapper = document.createElement('div');
			wrapper.innerHTML = '' + content;
			while (wrapper.firstChild) el.appendChild(wrapper.firstChild);
		} else {
			el.appendChild(document.createTextNode('' + content));
		}
	}
	//#endregion

	//#region Bootstrap modal and focus management
	function createBootstrapModalController(modalEl, config) {
		if (!window.bootstrap || !window.bootstrap.Modal) {
			throw configError('Bootstrap Modal is not available.');
		}
		const instance = new window.bootstrap.Modal(modalEl, {
			backdrop: config.backdrop ? 'static' : false,
			keyboard: false,
			focus: true
		});
		return {
			show: function() {
				instance.show();
				setTimeout(markBackdrop, 0);
			},
			hide: function() {
				instance.hide();
			},
			whenShown: function(handler) {
				modalEl.addEventListener('shown.bs.modal', function(event) {
					markBackdrop();
					handler(event);
				});
			},
			whenHidden: function(handler) {
				modalEl.addEventListener('hidden.bs.modal', handler);
			},
			dispose: function() {
				instance.dispose();
			}
		};

		function markBackdrop() {
			const backdrops = document.querySelectorAll('.modal-backdrop');
			const backdrop = backdrops[backdrops.length - 1];
			if (backdrop) backdrop.classList.add('rc-dialog-backdrop');
		}
	}

	function focusInitialElement(dialog) {
		setTimeout(function() {
			if (dialog.closed) return;
			let target = null;
			try {
				target = getConfiguredInitialFocus(dialog);
			} catch (error) {
				logError(error);
			}
			if (!target) target = getFirstFocusable(dialog.bodyEl);
			if (!target) target = getFooterFocusButton(dialog);
			if (!target) target = dialog.modalEl;
			try {
				target.focus();
			} catch (error) {
				logError(error);
			}
		}, 20);
	}

	function getConfiguredInitialFocus(dialog) {
		const target = dialog.hasInitialFocusOverride
			? dialog.initialFocusTarget
			: (hasOwn(dialog.options.raw, 'initialFocus') ? resolveScalar(dialog.options.raw.initialFocus, dialog.ctx, null) : null);
		if (target == null || target === false) return null;
		return resolveFocusTarget(target, 'initialFocus');
	}

	function getFooterFocusButton(dialog) {
		let explicit = null;
		let fallback = null;
		dialog.options.buttons.forEach(function(button) {
			const resolved = resolveButton(button, dialog.ctx, dialog.options.display.intent);
			const el = dialog.buttonElements[button.id];
			if (!el || resolved.hidden || resolved.disabled || resolved.loading) return;
			if (resolved.autofocus === true && !explicit) explicit = el;
			if (!fallback && resolved.intent === 'primary') fallback = el;
		});
		return explicit || fallback;
	}

	function getFirstFocusable(scope) {
		if (!scope) return null;
		const candidates = scope.querySelectorAll('input:not([type="hidden"]), textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])');
		for (let i = 0; i < candidates.length; i++) {
			if (isFocusable(candidates[i])) return candidates[i];
		}
		return null;
	}

	function isFocusable(el) {
		if (!el || el.disabled || el.hidden) return false;
		const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
		if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
		if (el.offsetParent === null && style && style.position !== 'fixed') return false;
		return typeof el.focus === 'function';
	}

	function resolveFocusAfterClose(dialog, fallback) {
		let target;
		if (dialog.hasFocusAfterCloseOverride) {
			target = dialog.focusAfterCloseTarget;
		} else if (hasOwn(dialog.options.raw, 'focusAfterClose')) {
			target = resolveScalar(dialog.options.raw.focusAfterClose, dialog.ctx, null);
		} else {
			return fallback;
		}
		if (target === false) return false;
		if (target == null) return fallback;
		return resolveFocusTarget(target, 'focusAfterClose');
	}

	function resolveFocusTarget(target, optionName) {
		if (typeof target === 'string') {
			return document.querySelector(target);
		}
		if (isJQueryObject(target)) {
			return target.length ? target[0] : null;
		}
		if (isNode(target)) {
			return target;
		}
		throw configError(optionName + ' must be a selector, jQuery object, DOM element, false, null, or a function returning one of those values.');
	}

	function validateFocusOption(options, optionName) {
		if (!hasOwn(options, optionName)) return;
		const value = options[optionName];
		if (typeof value === 'function') return;
		validateFocusTarget(value, optionName);
	}

	function validateFocusTarget(value, optionName) {
		if (value == null || value === false || typeof value === 'string' || isJQueryObject(value) || isNode(value)) return;
		throw configError(optionName + ' must be a selector, jQuery object, DOM element, false, null, or a function.');
	}
	//#endregion

	//#region Dragging and stack positioning
	function enableDrag(dialog) {
		const handle = dialog.headerEl;
		const target = dialog.dialogEl;
		let startX = 0;
		let startY = 0;
		let startLeft = 0;
		let startTop = 0;
		let dragging = false;
		const edgeGap = 8;

		const targetRect = target.getBoundingClientRect();
		const contentRect = dialog.contentEl ? dialog.contentEl.getBoundingClientRect() : targetRect;
		const visualLeft = contentRect.left || targetRect.left;
		const visualTop = contentRect.top || targetRect.top;
		const visualWidth = contentRect.width || targetRect.width;
		const visualHeight = contentRect.height || targetRect.height;
		const centeredParentBase = getCenteredParentBase(dialog, visualWidth, visualHeight, edgeGap);

		target.classList.remove('modal-dialog-centered');
		target.style.position = 'absolute';
		target.style.margin = '0';
		target.style.minHeight = '0';
		target.style.display = 'block';
		target.style.alignItems = 'stretch';
		target.style.transform = 'none';
		const baseLeft = centeredParentBase ? centeredParentBase.left : clamp(visualLeft, edgeGap, getMaxLeft());
		const baseTop = centeredParentBase ? centeredParentBase.top : clamp(visualTop, edgeGap, getMaxTop());
		const stackDepth = centeredParentBase ? 0 : getAutoStackDepth(dialog, baseLeft, baseTop);
		dialog.stackBaseLeft = baseLeft;
		dialog.stackBaseTop = baseTop;
		dialog.stackDepth = stackDepth;

		target.style.width = visualWidth + 'px';
		target.style.maxWidth = 'calc(100% - ' + (edgeGap * 2) + 'px)';
		target.style.left = clamp(baseLeft + (STACK_OFFSET_X * stackDepth), edgeGap, getMaxLeft()) + 'px';
		target.style.top = clamp(baseTop + (STACK_OFFSET_Y * stackDepth), edgeGap, getMaxTop()) + 'px';
		target.classList.remove('rc-dialog-centered-parent-pending');

		const onMouseDown = function(event) {
			if (event.button !== 0) return;
			if (event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
			event.preventDefault();
			dragging = true;
			startX = event.clientX;
			startY = event.clientY;
			startLeft = parseFloat(target.style.left) || 0;
			startTop = parseFloat(target.style.top) || 0;
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		};

		const onMouseMove = function(event) {
			if (!dragging) return;
			const nextLeft = startLeft + event.clientX - startX;
			const nextTop = startTop + event.clientY - startY;
			target.style.left = clamp(nextLeft, edgeGap, getMaxLeft()) + 'px';
			target.style.top = clamp(nextTop, edgeGap, getMaxTop()) + 'px';
		};

		const onMouseUp = function() {
			dragging = false;
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};

		const onResize = function() {
			if (dialog.childDialogCount > 0) return;
			target.style.left = clamp(parseFloat(target.style.left) || edgeGap, edgeGap, getMaxLeft()) + 'px';
			target.style.top = clamp(parseFloat(target.style.top) || edgeGap, edgeGap, getMaxTop()) + 'px';
		};

		function getMaxLeft() {
			return Math.max(edgeGap, window.innerWidth - getMinimumVisibleWidth());
		}

		function getMaxTop() {
			return Math.max(edgeGap, window.innerHeight - getMinimumVisibleHeight());
		}

		function getMinimumVisibleWidth() {
			return Math.min(120, Math.max(48, target.offsetWidth * 0.12));
		}

		function getMinimumVisibleHeight() {
			return Math.min(96, Math.max(44, handle.offsetHeight || 44));
		}

		handle.addEventListener('mousedown', onMouseDown);
		window.addEventListener('resize', onResize);
		dialog.cleanups.push(function() {
			handle.removeEventListener('mousedown', onMouseDown);
			window.removeEventListener('resize', onResize);
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		});
	}

	function enableResize(dialog) {
		if (!dialog.resizeHandles || !dialog.dialogEl || !dialog.contentEl) return;

		const target = dialog.dialogEl;
		const content = dialog.contentEl;
		const handles = [dialog.resizeHandles.bottom, dialog.resizeHandles.right, dialog.resizeHandles.corner];
		let active = null;

		const onPointerDown = function(event) {
			if (event.button != null && event.button !== 0) return;
			const handle = event.currentTarget;
			const axis = handle.getAttribute('data-rc-dialog-resize-axis') || '';
			const base = pinDialogForResize(dialog);
			event.preventDefault();
			event.stopPropagation();
			markDialogInteraction(dialog);
			active = {
				handle: handle,
				axis: axis,
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				startWidth: base.width,
				startHeight: base.height,
				minWidth: dialog.options.display.minWidth,
				minHeight: dialog.options.display.minHeight,
				maxWidth: getResizeMaxWidth(dialog, base.left, base.width),
				maxHeight: getResizeMaxHeight(dialog, base.top, base.height)
			};
			handle.classList.add('rc-dialog-resize-active');
			target.classList.add('rc-dialog-resizing');
			if (axis.indexOf('y') !== -1) {
				content.style.height = base.height + 'px';
				applyConstrainedBodyLayout(dialog);
			}
			if (typeof handle.setPointerCapture === 'function') {
				try {
					handle.setPointerCapture(event.pointerId);
				} catch (error) {}
			}
			document.addEventListener('pointermove', onPointerMove);
			document.addEventListener('pointerup', onPointerUp);
			document.addEventListener('pointercancel', onPointerUp);
		};

		const onPointerMove = function(event) {
			if (!active) return;
			event.preventDefault();
			if (active.axis.indexOf('x') !== -1) {
				const width = clamp(active.startWidth + event.clientX - active.startX, active.minWidth, active.maxWidth);
				target.style.width = width + 'px';
			}
			if (active.axis.indexOf('y') !== -1) {
				const height = clamp(active.startHeight + event.clientY - active.startY, active.minHeight, active.maxHeight);
				content.style.height = height + 'px';
			}
		};

		const onPointerUp = function() {
			if (!active) return;
			const handle = active.handle;
			if (typeof handle.releasePointerCapture === 'function') {
				try {
					handle.releasePointerCapture(active.pointerId);
				} catch (error) {}
			}
			handle.classList.remove('rc-dialog-resize-active');
			target.classList.remove('rc-dialog-resizing');
			active = null;
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp);
			document.removeEventListener('pointercancel', onPointerUp);
		};

		handles.forEach(function(handle) {
			handle.addEventListener('pointerdown', onPointerDown);
		});
		dialog.cleanups.push(function() {
			handles.forEach(function(handle) {
				handle.removeEventListener('pointerdown', onPointerDown);
				handle.classList.remove('rc-dialog-resize-active');
			});
			target.classList.remove('rc-dialog-resizing');
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp);
			document.removeEventListener('pointercancel', onPointerUp);
		});
	}

	function pinDialogForResize(dialog) {
		const target = dialog.dialogEl;
		const content = dialog.contentEl;
		const targetRect = target.getBoundingClientRect();
		const contentRect = content.getBoundingClientRect();
		const left = contentRect.left || targetRect.left;
		const top = contentRect.top || targetRect.top;
		const width = contentRect.width || targetRect.width;
		const height = contentRect.height || targetRect.height;

		target.classList.remove('modal-dialog-centered');
		target.classList.remove('rc-dialog-centered-parent-pending');
		target.style.position = 'absolute';
		target.style.margin = '0';
		target.style.minHeight = '0';
		target.style.display = 'block';
		target.style.alignItems = 'stretch';
		target.style.transform = 'none';
		target.style.left = left + 'px';
		target.style.top = top + 'px';
		target.style.width = width + 'px';
		target.style.maxWidth = 'none';

		return {
			left: left,
			top: top,
			width: width,
			height: height
		};
	}

	function getResizeMaxWidth(dialog, left, startWidth) {
		const display = dialog.options.display;
		if (!display.fitToViewport) return Infinity;
		const available = window.innerWidth - left - display.viewportMargin;
		return Math.max(display.minWidth, startWidth, available);
	}

	function getResizeMaxHeight(dialog, top, startHeight) {
		const display = dialog.options.display;
		if (!display.fitToViewport) return Infinity;
		const available = window.innerHeight - top - display.viewportMargin;
		return Math.max(display.minHeight, startHeight, available);
	}

	function positionDialogOverParent(dialog) {
		const target = dialog.dialogEl;
		if (!target || dialog.options.display.placement !== 'centered-parent') return;

		const edgeGap = 8;
		const targetRect = target.getBoundingClientRect();
		const contentRect = dialog.contentEl ? dialog.contentEl.getBoundingClientRect() : targetRect;
		const visualWidth = contentRect.width || targetRect.width;
		const visualHeight = contentRect.height || targetRect.height;
		const base = getCenteredParentBase(dialog, visualWidth, visualHeight, edgeGap);
		if (!base) return;

		target.classList.remove('modal-dialog-centered');
		target.style.position = 'absolute';
		target.style.margin = '0';
		target.style.minHeight = '0';
		target.style.display = 'block';
		target.style.alignItems = 'stretch';
		target.style.transform = 'none';
		target.style.width = visualWidth + 'px';
		target.style.maxWidth = 'calc(100% - ' + (edgeGap * 2) + 'px)';
		target.style.left = base.left + 'px';
		target.style.top = base.top + 'px';
		target.classList.remove('rc-dialog-centered-parent-pending');
	}

	function getCenteredParentBase(dialog, visualWidth, visualHeight, edgeGap) {
		if (dialog.options.display.placement !== 'centered-parent') return null;

		const parentRect = getOpenerDialogRect(dialog) || {
			left: 0,
			top: 0,
			width: window.innerWidth,
			height: window.innerHeight
		};
		const minVisibleWidth = Math.min(120, Math.max(48, visualWidth * 0.12));
		const minVisibleHeight = Math.min(96, Math.max(44, visualHeight * 0.12));
		const maxLeft = Math.max(edgeGap, window.innerWidth - minVisibleWidth);
		const maxTop = Math.max(edgeGap, window.innerHeight - minVisibleHeight);
		const left = parentRect.left + ((parentRect.width - visualWidth) / 2);
		const top = parentRect.top + ((parentRect.height - visualHeight) / 2);
		return {
			left: clamp(left, edgeGap, maxLeft),
			top: clamp(top, edgeGap, maxTop)
		};
	}

	function getAutoStackDepth(dialog, baseLeft, baseTop) {
		const opener = dialog.openerDialog;
		if (!opener || opener.closed) return 0;

		if (typeof opener.stackBaseLeft === 'number' && typeof opener.stackBaseTop === 'number') {
			if (positionsMatch(baseLeft, baseTop, opener.stackBaseLeft, opener.stackBaseTop)) {
				return (opener.stackDepth || 0) + 1;
			}
		}

		if (opener.dialogEl) {
			const openerRect = opener.dialogEl.getBoundingClientRect();
			if (positionsMatch(baseLeft, baseTop, openerRect.left, openerRect.top)) {
				return 1;
			}
		}

		return 0;
	}

	function positionsMatch(leftA, topA, leftB, topB) {
		return Math.abs(leftA - leftB) <= STACK_MATCH_TOLERANCE
			&& Math.abs(topA - topB) <= STACK_MATCH_TOLERANCE;
	}
	//#endregion

	//#region Tabbed dialog support
	function createTabbed(options) {
		if (!options || typeof options !== 'object') {
			throw configError('Tabbed dialog options must be an object.');
		}
		if (hasOwn(options, 'body') || hasOwn(options, 'bodyHtml')) {
			throw configError('Tabbed dialogs use tabs instead of body/bodyHtml.');
		}
		if (!Array.isArray(options.tabs) || options.tabs.length === 0) {
			throw configError('Tabbed dialog requires a non-empty tabs array.');
		}
		validateContentPair(options, 'beforeTabs', 'beforeTabsHtml');
		validateContentPair(options, 'afterTabs', 'afterTabsHtml');

		const state = {
			idPrefix: 'rc-dialog-tabbed-' + (++tabbedCounter),
			domCounter: 0,
			tabs: normalizeTabbedTabs(options.tabs),
			activeId: null,
			initialTab: hasOwn(options, 'initialTab') ? options.initialTab : null,
			initialTabResolved: false,
			ctx: null,
			refs: null,
			beforeSlot: makeContentSlot(options, 'beforeTabs', 'beforeTabsHtml'),
			afterSlot: makeContentSlot(options, 'afterTabs', 'afterTabsHtml'),
			hasBeforeSlot: hasOwn(options, 'beforeTabs') || hasOwn(options, 'beforeTabsHtml'),
			hasAfterSlot: hasOwn(options, 'afterTabs') || hasOwn(options, 'afterTabsHtml')
		};
		state.tabs.forEach(function(tab) {
			allocateTabbedDomIds(state, tab);
		});

		const coreOptions = assign({}, options);
		delete coreOptions.tabs;
		delete coreOptions.initialTab;
		delete coreOptions.beforeTabs;
		delete coreOptions.beforeTabsHtml;
		delete coreOptions.afterTabs;
		delete coreOptions.afterTabsHtml;
		coreOptions.body = function(ctx) {
			state.ctx = ctx;
			initializeTabbedActiveId(state);
			if (!getTabbedTab(state, state.activeId) || !isTabbedTabUsable(state, getTabbedTab(state, state.activeId))) {
				state.activeId = findFirstUsableTabbedTabId(state);
			}
			return renderTabbedBody(state, ctx);
		};

		coreOptions.__rcDialogSetup = function(ctx) {
			const originalSetup = options.__rcDialogSetup;
			state.ctx = ctx;
			installTabbedMethods(ctx, state);
			if (typeof originalSetup === 'function') originalSetup(ctx);
		};

		return rcDialog(coreOptions);
	}

	function normalizeTabbedTabs(tabs) {
		const seen = {};
		return tabs.map(function(tab, index) {
			const normalized = normalizeTabbedTab(tab, index);
			if (seen[normalized.id]) {
				throw configError('Duplicate tab id "' + normalized.id + '".');
			}
			seen[normalized.id] = true;
			return normalized;
		});
	}

	function normalizeTabbedTab(tab, index) {
		if (!tab || typeof tab !== 'object') {
			throw configError('Tab at index ' + index + ' must be an object.');
		}
		if (typeof tab.id !== 'string' || tab.id === '') {
			throw configError('Tab at index ' + index + ' has no id.');
		}
		validateTabbedTabId(tab.id);
		validateLabelPair(tab, 'Tab "' + tab.id + '"');
		if (!hasOwn(tab, 'label') && !hasOwn(tab, 'labelHtml')) {
			throw configError('Tab "' + tab.id + '" requires label or labelHtml.');
		}
		validateContentPair(tab, 'body', 'bodyHtml', 'Tab "' + tab.id + '": ');
		return assign({}, tab);
	}

	function validateTabbedTabId(id) {
		if (id.indexOf('__') === 0) {
			throw configError('Tab id "' + id + '" is reserved.');
		}
	}

	function allocateTabbedDomIds(state, tab) {
		const suffix = ++state.domCounter;
		tab._tabButtonId = state.idPrefix + '-tab-' + suffix;
		tab._tabPaneId = state.idPrefix + '-pane-' + suffix;
	}

	function installTabbedMethods(ctx, state) {
		ctx.tabs = {
			update: function(id, patch) {
				const tab = requireTabbedTab(state, id, 'ctx.tabs.update()');
				const before = getTabbedPublicTab(tab);
				patch = patch || {};
				validateTabbedUpdatePatch(patch, id);
				if (hasOwn(patch, 'labelHtml')) delete tab.label;
				if (hasOwn(patch, 'label')) delete tab.labelHtml;
				assign(tab, patch);
				renderTabbedTabFace(state, tab);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:updated', {
					tab: getTabbedPublicTab(tab),
					previous: before,
					reason: 'update'
				});
				return getTabbedPublicTab(tab);
			},
			setBody: function(id, content) {
				return setTabbedTabBody(state, id, content, false);
			},
			setBodyHtml: function(id, html) {
				return setTabbedTabBody(state, id, html, true);
			},
			remove: function(id) {
				const index = getTabbedTabIndex(state, id);
				if (index === -1) return false;
				const previousId = state.activeId;
				const tab = state.tabs[index];
				const removed = getTabbedPublicTab(tab);
				state.tabs.splice(index, 1);
				if (tab._navItemEl && tab._navItemEl.parentNode) tab._navItemEl.parentNode.removeChild(tab._navItemEl);
				if (tab._paneEl && tab._paneEl.parentNode) tab._paneEl.parentNode.removeChild(tab._paneEl);
				if (state.activeId === id) state.activeId = findFirstUsableTabbedTabId(state);
				ensureTabbedActiveState(state);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:removed', {
					tab: removed,
					active: getTabbedPublicTab(getTabbedTab(state, state.activeId)),
					reason: 'remove'
				});
				emitTabbedChangedIfNeeded(state, previousId, state.activeId, 'remove');
				return true;
			},
			add: function(tab, afterId) {
				const normalized = normalizeTabbedTab(tab, state.tabs.length);
				if (getTabbedTab(state, normalized.id)) {
					throw configError('Duplicate tab id "' + normalized.id + '".');
				}
				const previousId = state.activeId;
				allocateTabbedDomIds(state, normalized);
				const insertIndex = resolveTabbedInsertIndex(state, afterId);
				state.tabs.splice(insertIndex, 0, normalized);
				if (state.refs) renderTabbedTab(state, normalized);
				if (!state.activeId && isTabbedTabUsable(state, normalized)) state.activeId = findFirstUsableTabbedTabId(state);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:inserted', {
					tab: getTabbedPublicTab(normalized),
					afterId: typeof afterId === 'undefined' ? '__last' : afterId,
					index: insertIndex,
					reason: 'add'
				});
				emitTabbedChangedIfNeeded(state, previousId, state.activeId, 'add');
				return getTabbedPublicTab(normalized);
			},
			enable: function(id) {
				const previousId = state.activeId;
				const tab = requireTabbedTab(state, id, 'ctx.tabs.enable()');
				const before = getTabbedPublicTab(tab);
				tab.disabled = false;
				if (!state.activeId) state.activeId = findFirstUsableTabbedTabId(state);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:updated', {
					tab: getTabbedPublicTab(tab),
					previous: before,
					reason: 'enable'
				});
				emitTabbedChangedIfNeeded(state, previousId, state.activeId, 'enable');
				return true;
			},
			disable: function(id) {
				const previousId = state.activeId;
				const tab = requireTabbedTab(state, id, 'ctx.tabs.disable()');
				const before = getTabbedPublicTab(tab);
				tab.disabled = true;
				if (state.activeId === id) state.activeId = findFirstUsableTabbedTabId(state);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:updated', {
					tab: getTabbedPublicTab(tab),
					previous: before,
					reason: 'disable'
				});
				emitTabbedChangedIfNeeded(state, previousId, state.activeId, 'disable');
				return true;
			},
			show: function(id) {
				const previousId = state.activeId;
				const tab = requireTabbedTab(state, id, 'ctx.tabs.show()');
				const before = getTabbedPublicTab(tab);
				tab.hidden = false;
				if (!state.activeId) state.activeId = findFirstUsableTabbedTabId(state);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:updated', {
					tab: getTabbedPublicTab(tab),
					previous: before,
					reason: 'show'
				});
				emitTabbedChangedIfNeeded(state, previousId, state.activeId, 'show');
				return true;
			},
			hide: function(id) {
				const previousId = state.activeId;
				const tab = requireTabbedTab(state, id, 'ctx.tabs.hide()');
				const before = getTabbedPublicTab(tab);
				tab.hidden = true;
				if (state.activeId === id) state.activeId = findFirstUsableTabbedTabId(state);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:updated', {
					tab: getTabbedPublicTab(tab),
					previous: before,
					reason: 'hide'
				});
				emitTabbedChangedIfNeeded(state, previousId, state.activeId, 'hide');
				return true;
			},
			move: function(id, afterId) {
				const currentIndex = getTabbedTabIndex(state, id);
				if (currentIndex === -1) {
					throw configError('ctx.tabs.move() references unknown tab id "' + id + '".');
				}
				const tab = state.tabs[currentIndex];
				const before = getTabbedPublicTab(tab);
				const resolvedAfterId = resolveTabbedPositionAlias(state, afterId);
				if (resolvedAfterId === id) {
					syncTabbedDom(state);
					return true;
				}
				validateTabbedInsertPosition(state, resolvedAfterId);
				state.tabs.splice(currentIndex, 1);
				const insertIndex = resolveTabbedInsertIndex(state, resolvedAfterId);
				state.tabs.splice(insertIndex, 0, tab);
				syncTabbedDom(state);
				emitTabbedEvent(state, 'tab:updated', {
					tab: getTabbedPublicTab(tab),
					previous: before,
					afterId: resolvedAfterId,
					index: insertIndex,
					reason: 'move'
				});
				return true;
			},
			activate: function(id) {
				return activateTabbedTab(state, id, 'api');
			}
		};
	}

	function validateTabbedUpdatePatch(patch, id) {
		if (!patch || typeof patch !== 'object') {
			throw configError('ctx.tabs.update() patch for tab "' + id + '" must be an object.');
		}
		validateLabelPair(patch, 'Tab "' + id + '"');
		Object.keys(patch).forEach(function(key) {
			if (['icon', 'label', 'labelHtml'].indexOf(key) === -1) {
				throw configError('ctx.tabs.update() cannot change tab ' + key + '.');
			}
		});
	}

	function setTabbedTabBody(state, id, content, isHtml) {
		const tab = requireTabbedTab(state, id, isHtml ? 'ctx.tabs.setBodyHtml()' : 'ctx.tabs.setBody()');
		const before = getTabbedPublicTab(tab);
		if (isHtml) {
			delete tab.body;
			tab.bodyHtml = content;
		} else {
			delete tab.bodyHtml;
			tab.body = content;
		}
		if (tab._paneEl) {
			setSlotContent(tab._paneEl, content, isHtml);
		}
		emitTabbedEvent(state, 'tab:updated', {
			tab: getTabbedPublicTab(tab),
			previous: before,
			reason: isHtml ? 'setBodyHtml' : 'setBody'
		});
		return getTabbedPublicTab(tab);
	}

	function createTabbedScrollIndicator(direction) {
		const control = document.createElement('button');
		control.type = 'button';
		control.className = 'rc-dialog-tab-scroll-indicator rc-dialog-tab-scroll-indicator-' + direction;
		control.setAttribute('aria-label', direction === 'left' ? 'Scroll tabs left' : 'Scroll tabs right');
		control.setAttribute('aria-hidden', 'true');
		control.disabled = true;
		control.tabIndex = -1;
		control.addEventListener('mousedown', function(event) {
			event.preventDefault();
		});

		const icon = document.createElement('i');
		icon.className = 'fa-solid fa-angle-' + direction;
		icon.setAttribute('aria-hidden', 'true');
		control.appendChild(icon);
		return control;
	}

	function renderTabbedBody(state, ctx) {
		const wrapper = document.createElement('div');
		wrapper.className = 'rc-dialog-tabs';

		if (state.hasBeforeSlot) {
			const before = document.createElement('div');
			before.className = 'rc-dialog-tabs-before';
			setSlotContent(before, evaluateContentSlot(state.beforeSlot, ctx), state.beforeSlot.isHtml);
			wrapper.appendChild(before);
		}

		const strip = document.createElement('div');
		strip.className = 'rc-dialog-tab-strip';

		const line = document.createElement('div');
		line.className = 'rc-dialog-tab-line';
		line.setAttribute('aria-hidden', 'true');

		const scroll = document.createElement('div');
		scroll.className = 'rc-dialog-tab-scroll';

		const leftIndicator = createTabbedScrollIndicator('left');
		const rightIndicator = createTabbedScrollIndicator('right');

		const list = document.createElement('ul');
		list.className = 'nav nav-tabs rc-dialog-tab-list';
		list.setAttribute('role', 'tablist');

		const paneContainer = document.createElement('div');
		paneContainer.className = 'tab-content rc-dialog-tab-content';

		scroll.appendChild(list);
		strip.appendChild(line);
		strip.appendChild(scroll);
		strip.appendChild(leftIndicator);
		strip.appendChild(rightIndicator);
		wrapper.appendChild(strip);
		wrapper.appendChild(paneContainer);

		if (state.hasAfterSlot) {
			const after = document.createElement('div');
			after.className = 'rc-dialog-tabs-after';
			setSlotContent(after, evaluateContentSlot(state.afterSlot, ctx), state.afterSlot.isHtml);
			wrapper.appendChild(after);
		}

		state.refs = {
			wrapperEl: wrapper,
			tabStripEl: strip,
			scrollEl: scroll,
			leftScrollIndicatorEl: leftIndicator,
			rightScrollIndicatorEl: rightIndicator,
			tabListEl: list,
			paneContainerEl: paneContainer
		};

		attachTabbedScrollIndicators(state);
		attachTabbedScrollWheel(state);
		attachTabbedFocusBridge(state);
		state.tabs.forEach(function(tab) {
			renderTabbedTab(state, tab);
		});
		syncTabbedDom(state);
		return wrapper;
	}

	function attachTabbedScrollIndicators(state) {
		const left = state.refs && state.refs.leftScrollIndicatorEl;
		const right = state.refs && state.refs.rightScrollIndicatorEl;
		if (!left || !right) return;
		left.addEventListener('click', function(event) {
			event.preventDefault();
			event.stopPropagation();
			scrollTabbedStripByIndicator(state, 'left');
		});
		right.addEventListener('click', function(event) {
			event.preventDefault();
			event.stopPropagation();
			scrollTabbedStripByIndicator(state, 'right');
		});
	}

	function attachTabbedScrollWheel(state) {
		const scroll = state.refs && state.refs.scrollEl;
		if (!scroll) return;
		const updateFades = function() {
			updateTabbedScrollFades(state);
		};
		scroll.addEventListener('wheel', function(event) {
			if (scroll.scrollWidth <= scroll.clientWidth) return;
			if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
			const before = scroll.scrollLeft;
			scroll.scrollLeft += event.deltaY;
			if (scroll.scrollLeft !== before) {
				event.preventDefault();
				updateFades();
			}
		}, { passive: false });
		scroll.addEventListener('scroll', updateFades);
		setTimeout(updateFades, 0);
		setTimeout(updateFades, 120);
	}

	function scrollTabbedStripByIndicator(state, direction) {
		const scroll = state.refs && state.refs.scrollEl;
		if (!scroll) return;
		const maxScroll = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
		if (maxScroll <= 1) return;

		const target = getTabbedIndicatorScrollTarget(state, direction, maxScroll);
		scrollTabbedStripTo(scroll, target);
		updateTabbedScrollFades(state);
		setTimeout(function() {
			updateTabbedScrollFades(state);
		}, 180);
	}

	function getTabbedIndicatorScrollTarget(state, direction, maxScroll) {
		const scroll = state.refs.scrollEl;
		const bounds = getTabbedScrollVisibleBounds(scroll, maxScroll);
		const targetTab = getNextClippedTabbedTab(state, direction, bounds);
		let targetLeft;

		if (targetTab && targetTab._buttonEl) {
			const rect = targetTab._buttonEl.getBoundingClientRect();
			const visibleWidth = Math.max(1, bounds.right - bounds.left);
			if (direction === 'left') {
				targetLeft = rect.width >= visibleWidth
					? scroll.scrollLeft + (rect.right - bounds.right)
					: scroll.scrollLeft - (bounds.left - rect.left);
			} else {
				targetLeft = rect.width >= visibleWidth
					? scroll.scrollLeft + (rect.left - bounds.left)
					: scroll.scrollLeft + (rect.right - bounds.right);
			}
		} else {
			const fallbackAmount = Math.max(48, scroll.clientWidth * 0.65);
			targetLeft = scroll.scrollLeft + (direction === 'left' ? -fallbackAmount : fallbackAmount);
		}

		return clamp(targetLeft, 0, maxScroll);
	}

	function getTabbedScrollVisibleBounds(scroll, maxScroll) {
		const rect = scroll.getBoundingClientRect();
		const maxInset = Math.max(0, (rect.width - 24) / 2);
		const leftInset = scroll.scrollLeft > 1 ? Math.min(TABBED_SCROLL_EDGE_FADE, maxInset) : 0;
		const rightInset = scroll.scrollLeft < maxScroll - 1 ? Math.min(TABBED_SCROLL_EDGE_FADE, maxInset) : 0;
		return {
			left: rect.left + leftInset,
			right: rect.right - rightInset
		};
	}

	function getNextClippedTabbedTab(state, direction, bounds) {
		const tolerance = 1;
		const tabs = direction === 'left' ? state.tabs.slice().reverse() : state.tabs;
		for (let i = 0; i < tabs.length; i++) {
			const tab = tabs[i];
			if (!tab._buttonEl || !tab._navItemEl || tab._navItemEl.hidden) continue;
			const rect = tab._buttonEl.getBoundingClientRect();
			if (direction === 'left' && rect.left < bounds.left - tolerance) return tab;
			if (direction === 'right' && rect.right > bounds.right + tolerance) return tab;
		}
		return null;
	}

	function scrollTabbedStripTo(scroll, left) {
		if (typeof scroll.scrollTo === 'function') {
			try {
				scroll.scrollTo({ left: left, behavior: 'smooth' });
				return;
			} catch (error) {}
		}
		scroll.scrollLeft = left;
	}

	function attachTabbedFocusBridge(state) {
		const strip = state.refs && state.refs.tabStripEl;
		if (!strip) return;
		const getRoot = function() {
			return typeof strip.closest === 'function' ? strip.closest('.rc-dialog') : null;
		};
		const setFocusState = function() {
			const root = getRoot();
			if (!root) return;
			root.classList.add('rc-dialog-tab-focus-within');
		};
		const clearFocusState = function() {
			const root = getRoot();
			if (!root) return;
			root.classList.toggle('rc-dialog-tab-focus-within', strip.contains(document.activeElement));
		};
		strip.addEventListener('focusin', setFocusState);
		strip.addEventListener('focusout', function() {
			setTimeout(clearFocusState, 0);
		});
	}

	function renderTabbedTab(state, tab) {
		if (!state.refs || tab._navItemEl || tab._paneEl) return;

		const item = document.createElement('li');
		item.className = 'nav-item rc-dialog-tab-item';
		item.setAttribute('role', 'presentation');

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'nav-link rc-dialog-tab-link';
		button.id = tab._tabButtonId;
		button.setAttribute('data-bs-toggle', 'tab');
		button.setAttribute('data-bs-target', '#' + tab._tabPaneId);
		button.setAttribute('role', 'tab');
		button.setAttribute('aria-controls', tab._tabPaneId);
		button.setAttribute('aria-selected', 'false');
		button.addEventListener('click', function(event) {
			event.preventDefault();
			event.stopPropagation();
			activateTabbedTab(state, tab.id, 'click');
		});

		const pane = document.createElement('div');
		pane.className = 'tab-pane fade rc-dialog-tab-pane';
		pane.id = tab._tabPaneId;
		pane.setAttribute('role', 'tabpanel');
		pane.setAttribute('aria-labelledby', tab._tabButtonId);
		pane.setAttribute('tabindex', '0');
		setSlotContent(pane, renderTabbedTabBody(state, tab), hasOwn(tab, 'bodyHtml'));

		item.appendChild(button);
		tab._navItemEl = item;
		tab._buttonEl = button;
		tab._paneEl = pane;
		renderTabbedTabFace(state, tab);
	}

	function renderTabbedTabBody(state, tab) {
		if (hasOwn(tab, 'bodyHtml')) return resolveScalar(tab.bodyHtml, state.ctx, '');
		if (hasOwn(tab, 'body')) return resolveScalar(tab.body, state.ctx, '');
		return '';
	}

	function renderTabbedTabFace(state, tab) {
		const button = tab._buttonEl;
		if (!button) return;
		while (button.firstChild) button.removeChild(button.firstChild);

		const iconClass = resolveScalar(tab.icon, state.ctx, null);
		if (iconClass) {
			const icon = document.createElement('i');
			icon.className = 'rc-dialog-tab-icon ' + iconClass;
			icon.setAttribute('aria-hidden', 'true');
			button.appendChild(icon);
		}

		const label = document.createElement('span');
		label.className = 'rc-dialog-tab-label';
		if (hasOwn(tab, 'labelHtml')) {
			appendContent(label, resolveScalar(tab.labelHtml, state.ctx, ''), true);
		} else {
			label.textContent = '' + resolveScalar(tab.label, state.ctx, '');
		}
		button.appendChild(label);
	}

	function syncTabbedDom(state) {
		if (!state.refs) return;
		if (!getTabbedTab(state, state.activeId) || !isTabbedTabUsable(state, getTabbedTab(state, state.activeId))) {
			state.activeId = findFirstUsableTabbedTabId(state);
		}
		let navCursor = state.refs.tabListEl.firstChild;
		let paneCursor = state.refs.paneContainerEl.firstChild;
		state.tabs.forEach(function(tab) {
			renderTabbedTab(state, tab);
			navCursor = placeTabbedNode(state.refs.tabListEl, tab._navItemEl, navCursor);
			paneCursor = placeTabbedNode(state.refs.paneContainerEl, tab._paneEl, paneCursor);
			syncTabbedTabState(state, tab);
		});
		updateTabbedScrollFades(state);
		setTimeout(function() {
			updateTabbedScrollFades(state);
		}, 0);
	}

	function placeTabbedNode(parent, child, cursor) {
		if (child === cursor) {
			return cursor.nextSibling;
		}
		parent.insertBefore(child, cursor);
		return cursor;
	}

	function updateTabbedScrollFades(state) {
		const scroll = state.refs && state.refs.scrollEl;
		const strip = state.refs && state.refs.tabStripEl;
		if (!scroll || !strip) return;
		const maxScroll = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
		const hasOverflow = maxScroll > 1;
		const hasLeft = hasOverflow && scroll.scrollLeft > 1;
		const hasRight = hasOverflow && scroll.scrollLeft < maxScroll - 1;
		strip.classList.toggle('rc-dialog-tab-strip-has-left', hasLeft);
		strip.classList.toggle('rc-dialog-tab-strip-has-right', hasRight);
		updateTabbedScrollIndicator(state.refs.leftScrollIndicatorEl, hasLeft);
		updateTabbedScrollIndicator(state.refs.rightScrollIndicatorEl, hasRight);
	}

	function updateTabbedScrollIndicator(indicator, enabled) {
		if (!indicator) return;
		indicator.disabled = !enabled;
		indicator.tabIndex = -1;
		indicator.setAttribute('aria-hidden', 'true');
	}

	function syncTabbedTabState(state, tab) {
		const hidden = isTabbedTabHidden(state, tab);
		const disabled = isTabbedTabDisabled(state, tab);
		const active = state.activeId === tab.id && !hidden && !disabled;
		if (tab._navItemEl) tab._navItemEl.hidden = hidden;
		if (tab._buttonEl) {
			tab._buttonEl.disabled = disabled;
			tab._buttonEl.classList.toggle('active', active);
			tab._buttonEl.classList.toggle('disabled', disabled);
			tab._buttonEl.setAttribute('aria-selected', active ? 'true' : 'false');
			tab._buttonEl.setAttribute('aria-disabled', disabled ? 'true' : 'false');
			tab._buttonEl.tabIndex = hidden || disabled ? -1 : 0;
		}
		if (tab._paneEl) {
			tab._paneEl.classList.toggle('active', active);
			tab._paneEl.classList.toggle('show', active);
		}
	}

	function ensureTabbedActiveState(state) {
		if (getTabbedTab(state, state.activeId) && isTabbedTabUsable(state, getTabbedTab(state, state.activeId))) return;
		state.activeId = findFirstUsableTabbedTabId(state);
	}

	function initializeTabbedActiveId(state) {
		if (state.initialTabResolved) return;
		state.initialTabResolved = true;
		if (state.initialTab == null || state.initialTab === '') return;
		const tab = requireTabbedTab(state, state.initialTab, 'initialTab');
		if (!isTabbedTabUsable(state, tab)) {
			throw configError('initialTab references a hidden or disabled tab "' + state.initialTab + '".');
		}
		state.activeId = tab.id;
	}

	function activateTabbedTab(state, id, reason) {
		const tab = requireTabbedTab(state, id, 'ctx.tabs.activate()');
		if (!isTabbedTabUsable(state, tab)) {
			return Promise.resolve(false);
		}
		const previousId = state.activeId;
		if (previousId === tab.id) {
			return Promise.resolve(false);
		}
		const beforeResult = emitTabbedVetoEvent(state, 'tab:beforeChange', {
			from: getTabbedPublicTab(getTabbedTab(state, previousId)),
			to: getTabbedPublicTab(tab),
			reason: reason || 'api'
		});
		return Promise.resolve(beforeResult).then(function(result) {
			if (result.handled && result.value === false) return false;
			state.activeId = tab.id;
			syncTabbedDom(state);
			emitTabbedChangedIfNeeded(state, previousId, state.activeId, reason || 'api');
			return true;
		}).catch(function(error) {
			logError(error);
			return false;
		});
	}

	function emitTabbedChangedIfNeeded(state, previousId, currentId, reason) {
		if (previousId === currentId) return;
		emitTabbedEvent(state, 'tab:changed', {
			previous: getTabbedPublicTab(getTabbedTab(state, previousId)),
			current: getTabbedPublicTab(getTabbedTab(state, currentId)),
			reason: reason
		});
	}

	function emitTabbedEvent(state, eventName, event) {
		if (!state.ctx || !state.ctx._dialog) return { handled: false, value: undefined };
		notifyLocalEvent(state.ctx._dialog, eventName, event);
		return { handled: false, value: undefined };
	}

	function emitTabbedVetoEvent(state, eventName, event) {
		if (!state.ctx || !state.ctx._dialog) return { handled: false, value: undefined };
		return emitVetoLocalEvent(state.ctx._dialog, eventName, event);
	}

	function findFirstUsableTabbedTabId(state) {
		for (let i = 0; i < state.tabs.length; i++) {
			if (isTabbedTabUsable(state, state.tabs[i])) return state.tabs[i].id;
		}
		return null;
	}

	function isTabbedTabUsable(state, tab) {
		return !!tab && !isTabbedTabHidden(state, tab) && !isTabbedTabDisabled(state, tab);
	}

	function isTabbedTabHidden(state, tab) {
		return resolveScalar(tab.hidden, state.ctx, false) === true;
	}

	function isTabbedTabDisabled(state, tab) {
		return resolveScalar(tab.disabled, state.ctx, false) === true;
	}

	function resolveTabbedInsertIndex(state, afterId) {
		if (state.tabs.length === 0) return 0;
		const resolved = resolveTabbedPositionAlias(state, afterId);
		if (resolved === '__beforeFirst') return 0;
		const index = getTabbedTabIndex(state, resolved);
		if (index === -1) throwTabbedPositionError(resolved);
		return index + 1;
	}

	function validateTabbedInsertPosition(state, resolved) {
		if (resolved === '__beforeFirst') return;
		if (getTabbedTabIndex(state, resolved) === -1) throwTabbedPositionError(resolved);
	}

	function throwTabbedPositionError(id) {
		throw configError('Unknown tab position id "' + id + '".');
	}

	function resolveTabbedPositionAlias(state, afterId) {
		const id = typeof afterId === 'undefined' || afterId == null ? '__last' : afterId;
		if (id === '__beforeFirst') return id;
		if (state.tabs.length === 0) return '__beforeFirst';
		if (id === '__first') return state.tabs[0].id;
		if (id === '__last') return state.tabs[state.tabs.length - 1].id;
		return id;
	}

	function requireTabbedTab(state, id, label) {
		const tab = getTabbedTab(state, id);
		if (!tab) {
			throw configError(label + ' references unknown tab id "' + id + '".');
		}
		return tab;
	}

	function getTabbedTab(state, id) {
		const index = getTabbedTabIndex(state, id);
		return index === -1 ? null : state.tabs[index];
	}

	function getTabbedTabIndex(state, id) {
		for (let i = 0; i < state.tabs.length; i++) {
			if (state.tabs[i].id === id) return i;
		}
		return -1;
	}

	function getTabbedPublicTab(tab) {
		if (!tab) return null;
		const copy = {};
		['id', 'icon', 'label', 'labelHtml', 'body', 'bodyHtml', 'disabled', 'hidden'].forEach(function(key) {
			if (hasOwn(tab, key)) copy[key] = tab[key];
		});
		return copy;
	}
	//#endregion

	//#region Wizard support
	function createWizard(options) {
		if (!options || typeof options !== 'object') {
			throw configError('Wizard options must be an object.');
		}
		if (!Array.isArray(options.pages) || options.pages.length === 0) {
			throw configError('Wizard requires a non-empty pages array.');
		}
		validateContentPair(options, 'title', 'titleHtml');
		validateContentPair(options, 'subtitle', 'subtitleHtml');
		validateContentPair(options, 'body', 'bodyHtml');

		const pages = normalizeWizardPages(options.pages);
		const state = hasOwn(options, 'state') ? options.state : {};
		let currentIndex = 0;
		const enteredPages = {};
		const coreOptions = assign({}, options);
		const hasExplicitProgress = hasOwn(coreOptions, 'progress');
		const pageLabelTemplate = normalizeWizardPageLabelTemplate(options);
		delete coreOptions.pages;
		delete coreOptions.pageLabelTemplate;
		coreOptions.state = state;
		if (!hasOwn(coreOptions, 'buttons')) {
			coreOptions.buttons = ['cancel', 'previous', 'next', 'finish'];
		}
		if (!hasOwn(coreOptions, 'closeButton')) {
			coreOptions.closeButton = 'cancel';
		}

		coreOptions.titleHtml = makeWizardTitleResolver(options, pages, function() { return currentIndex; });
		delete coreOptions.title;
		coreOptions.subtitleHtml = makeWizardSubtitleResolver(options, pages, function() { return currentIndex; });
		delete coreOptions.subtitle;
		coreOptions.body = function(ctx) {
			ensurePageEntered(ctx, pages[currentIndex], enteredPages);
			updateWizardButtons(ctx, currentIndex, pages.length);
			return renderWizardBody(ctx, pages[currentIndex]);
		};
		delete coreOptions.bodyHtml;
		if (!hasExplicitProgress) {
			coreOptions.progress = function() {
				return getWizardProgressValue(currentIndex, pages.length);
			};
		}
		if (pageLabelTemplate !== false) {
			coreOptions.__rcDialogProgressLabel = function() {
				return formatWizardPageLabel(pageLabelTemplate, currentIndex, pages.length);
			};
		}

		coreOptions.__rcDialogSetup = function(ctx) {
			const originalSetup = options.__rcDialogSetup;
			ctx.wizard = {
				get currentPage() {
					return pages[currentIndex];
				},
				get currentIndex() {
					return currentIndex;
				},
				next: function() {
					return goToWizardIndex(ctx, pages, currentIndex + 1, true);
				},
				previous: function() {
					return goToWizardIndex(ctx, pages, currentIndex - 1, false);
				},
				goTo: function(pageId) {
					const nextIndex = findWizardPageIndex(pages, pageId);
					if (nextIndex === -1) {
						throw configError('Unknown wizard page id "' + pageId + '".');
					}
					return goToWizardIndex(ctx, pages, nextIndex, true);
				},
				setBody: function(pageId, content) {
					return setWizardPageBody(ctx, pages, function() { return currentIndex; }, pageId, content, false);
				},
				setBodyHtml: function(pageId, html) {
					return setWizardPageBody(ctx, pages, function() { return currentIndex; }, pageId, html, true);
				},
				finish: function() {
					return finishWizard(ctx, pages[currentIndex]);
				},
				cancel: function() {
					emitWizardEvent(ctx, 'wizard:cancelled', {
						page: getWizardPublicPage(pages[currentIndex]),
						index: currentIndex
					});
					return ctx.close(null);
				}
			};
			installWizardButtonHandlers(ctx);
			if (typeof originalSetup === 'function') originalSetup(ctx);
		};

		return rcDialog(coreOptions);

		function goToWizardIndex(ctx, wizardPages, nextIndex, validateCurrent) {
			if (nextIndex < 0 || nextIndex >= wizardPages.length || nextIndex === currentIndex) {
				return Promise.resolve(false);
			}
			const currentPage = wizardPages[currentIndex];
			const nextPage = wizardPages[nextIndex];
			return validateAndLeavePage(ctx, currentPage, validateCurrent)
				.then(function(canLeave) {
					if (!canLeave) return false;
					return emitWizardVetoEvent(ctx, 'wizard:beforePageChange', {
						from: getWizardPublicPage(currentPage),
						to: getWizardPublicPage(nextPage),
						fromIndex: currentIndex,
						toIndex: nextIndex,
						direction: getWizardDirection(currentIndex, nextIndex),
						reason: 'navigate'
					});
				})
				.then(function(eventResult) {
					if (!eventResult || (eventResult.handled && eventResult.value === false)) return false;
					const previousIndex = currentIndex;
					const previousPage = wizardPages[previousIndex];
					currentIndex = nextIndex;
					ensurePageEntered(ctx, wizardPages[currentIndex], enteredPages);
					ctx._refreshDialog();
					updateWizardButtons(ctx, currentIndex, wizardPages.length);
					emitWizardEvent(ctx, 'wizard:pageChanged', {
						previous: getWizardPublicPage(previousPage),
						current: getWizardPublicPage(wizardPages[currentIndex]),
						previousIndex: previousIndex,
						currentIndex: currentIndex,
						direction: getWizardDirection(previousIndex, currentIndex),
						reason: 'navigate'
					});
					return false;
				})
				.catch(function(error) {
					logError(error);
					return false;
				});
		}
	}

	function normalizeWizardPages(pages) {
		const seen = {};
		return pages.map(function(page, index) {
			if (!page || typeof page !== 'object') {
				throw configError('Wizard page at index ' + index + ' must be an object.');
			}
			if (!page.id) {
				throw configError('Wizard page at index ' + index + ' has no id.');
			}
			if (seen[page.id]) {
				throw configError('Duplicate wizard page id "' + page.id + '".');
			}
			seen[page.id] = true;
			validateContentPair(page, 'title', 'titleHtml', 'Wizard page "' + page.id + '": ');
			validateContentPair(page, 'subtitle', 'subtitleHtml', 'Wizard page "' + page.id + '": ');
			validateContentPair(page, 'body', 'bodyHtml', 'Wizard page "' + page.id + '": ');
			return page;
		});
	}

	function normalizeWizardPageLabelTemplate(options) {
		if (!hasOwn(options, 'pageLabelTemplate')) return '{current} of {total}';
		const template = options.pageLabelTemplate;
		if (template == null || template === false) return false;
		if (typeof template !== 'string') {
			throw configError('pageLabelTemplate must be a string, false, or null.');
		}
		return template;
	}

	function formatWizardPageLabel(template, currentIndex, pageCount) {
		return template
			.replace(/\{current\}/g, '' + (currentIndex + 1))
			.replace(/\{total\}/g, '' + pageCount);
	}

	function makeWizardTitleResolver(options, pages, getIndex) {
		const useHtml = hasOwn(options, 'titleHtml') || pages.some(function(page) { return hasOwn(page, 'titleHtml'); });
		return function(ctx) {
			const page = pages[getIndex()];
			if (hasOwn(page, 'titleHtml')) return resolveScalar(page.titleHtml, ctx, '');
			if (hasOwn(page, 'title')) return escapeHtml(resolveScalar(page.title, ctx, ''));
			if (useHtml && hasOwn(options, 'titleHtml')) return resolveScalar(options.titleHtml, ctx, '');
			return useHtml ? escapeHtml(resolveScalar(options.title, ctx, '')) : escapeHtml(resolveScalar(options.title || '', ctx, ''));
		};
	}

	function makeWizardSubtitleResolver(options, pages, getIndex) {
		const useHtml = hasOwn(options, 'subtitleHtml') || pages.some(function(page) { return hasOwn(page, 'subtitleHtml'); });
		return function(ctx) {
			const page = pages[getIndex()];
			if (hasOwn(page, 'subtitleHtml')) return resolveScalar(page.subtitleHtml, ctx, '');
			if (hasOwn(page, 'subtitle')) return escapeHtml(resolveScalar(page.subtitle, ctx, ''));
			if (useHtml && hasOwn(options, 'subtitleHtml')) return resolveScalar(options.subtitleHtml, ctx, '');
			return useHtml ? escapeHtml(resolveScalar(options.subtitle, ctx, '')) : escapeHtml(resolveScalar(options.subtitle || '', ctx, ''));
		};
	}

	function renderWizardBody(ctx, page) {
		if (hasOwn(page, 'bodyHtml')) {
			return trustedHtmlToFragment(resolveWizardPageValue(page.bodyHtml, ctx, page, ''));
		}
		if (hasOwn(page, 'body')) {
			return resolveWizardPageValue(page.body, ctx, page, '');
		}
		return '';
	}

	function resolveWizardPageValue(value, ctx, page, defaultValue) {
		if (typeof value === 'undefined') return defaultValue;
		if (typeof value === 'function') return value(ctx, page);
		return value;
	}

	function trustedHtmlToFragment(html) {
		if (isNode(html) || isJQueryObject(html) || Array.isArray(html)) {
			const fragment = document.createDocumentFragment();
			appendContent(fragment, html, true);
			return fragment;
		}
		const template = document.createElement('template');
		template.innerHTML = html == null ? '' : '' + html;
		return template.content;
	}

	function ensurePageEntered(ctx, page, enteredPages) {
		if (enteredPages[page.id]) return;
		enteredPages[page.id] = true;
	}

	function validateAndLeavePage(ctx, page, shouldValidate) {
		return Promise.resolve(true);
	}

	function setWizardPageBody(ctx, pages, getCurrentIndex, pageId, content, isHtml) {
		const index = findWizardPageIndex(pages, pageId);
		if (index === -1) {
			throw configError((isHtml ? 'ctx.wizard.setBodyHtml()' : 'ctx.wizard.setBody()') + ' references unknown page id "' + pageId + '".');
		}
		const page = pages[index];
		if (isHtml) {
			delete page.body;
			page.bodyHtml = content;
		} else {
			delete page.bodyHtml;
			page.body = content;
		}
		if (index === getCurrentIndex()) {
			ctx._refreshDialog();
		}
		return getWizardPublicPage(page);
	}

	function finishWizard(ctx, page) {
		return validateAndLeavePage(ctx, page, true).then(function(canFinish) {
			if (!canFinish) return false;
			return emitWizardVetoEvent(ctx, 'wizard:beforePageChange', {
				from: getWizardPublicPage(page),
				to: null,
				fromIndex: ctx.wizard.currentIndex,
				toIndex: null,
				direction: 'finish',
				reason: 'finish'
			});
		}).then(function(eventResult) {
			if (!eventResult || (eventResult.handled && eventResult.value === false)) return false;
			return ctx.close(ctx.state).then(function(closed) {
				if (closed) {
					emitWizardEvent(ctx, 'wizard:finished', {
						page: getWizardPublicPage(page),
						index: ctx.wizard.currentIndex,
						result: ctx.state
					});
				}
				return closed;
			});
		}).catch(function(error) {
			logError(error);
			return false;
		});
	}

	function getWizardProgressValue(currentIndex, pageCount) {
		if (pageCount <= 1) return 1000;
		return Math.round((currentIndex / (pageCount - 1)) * 1000);
	}

	function updateWizardButtons(ctx, currentIndex, pageCount) {
		if (ctx.buttons.get('previous')) {
			if (currentIndex === 0) ctx.buttons.hide('previous');
			else ctx.buttons.show('previous');
		}
		if (ctx.buttons.get('next')) {
			if (currentIndex >= pageCount - 1) ctx.buttons.hide('next');
			else ctx.buttons.show('next');
		}
		if (ctx.buttons.get('finish')) {
			if (currentIndex >= pageCount - 1) ctx.buttons.show('finish');
			else ctx.buttons.hide('finish');
		}
	}

	function installWizardButtonHandlers(ctx) {
		const previous = ctx.buttons.get('previous');
		const next = ctx.buttons.get('next');
		const finish = ctx.buttons.get('finish');
		const cancel = ctx.buttons.get('cancel');

		if (previous) ctx.on('button:previous', function() { return ctx.wizard.previous(); });
		if (next) ctx.on('button:next', function() { return ctx.wizard.next(); });
		if (finish) ctx.on('button:finish', function() { return ctx.wizard.finish(); });
		if (cancel) ctx.on('button:cancel', function() { return ctx.wizard.cancel(); });
	}

	function emitWizardEvent(ctx, eventName, event) {
		if (!ctx || !ctx._dialog) return { handled: false, value: undefined };
		notifyLocalEvent(ctx._dialog, eventName, event);
		return { handled: false, value: undefined };
	}

	function emitWizardVetoEvent(ctx, eventName, event) {
		if (!ctx || !ctx._dialog) return { handled: false, value: undefined };
		return emitVetoLocalEvent(ctx._dialog, eventName, event);
	}

	function getWizardDirection(currentIndex, nextIndex) {
		if (nextIndex > currentIndex) return 'next';
		if (nextIndex < currentIndex) return 'previous';
		return 'goto';
	}

	function getWizardPublicPage(page) {
		if (!page) return null;
		const copy = {};
		['id', 'title', 'titleHtml', 'subtitle', 'subtitleHtml', 'body', 'bodyHtml'].forEach(function(key) {
			if (hasOwn(page, key)) copy[key] = page[key];
		});
		return copy;
	}

	function findWizardPageIndex(pages, pageId) {
		for (let i = 0; i < pages.length; i++) {
			if (pages[i].id === pageId) return i;
		}
		return -1;
	}
	//#endregion

	//#region Events, DOM, and small utilities
	function addLocalEvent(dialog, eventName, handler) {
		if (typeof eventName !== 'string' || eventName === '') {
			throw configError('ctx.on() requires an event name.');
		}
		if (typeof handler !== 'function') {
			throw configError('ctx.on() requires a handler function.');
		}
		if (!dialog.events) dialog.events = {};
		if (!dialog.events[eventName]) dialog.events[eventName] = [];
		dialog.events[eventName].push(handler);
		return function() {
			removeLocalEvent(dialog, eventName, handler);
		};
	}

	function removeLocalEvent(dialog, eventName, handler) {
		if (!dialog.events || !dialog.events[eventName]) return;
		dialog.events[eventName] = dialog.events[eventName].filter(function(item) {
			return item !== handler;
		});
	}

	function resolveScalar(value, ctx, defaultValue) {
		if (typeof value === 'undefined') return defaultValue;
		if (typeof value === 'function') return value(ctx);
		return value;
	}

	function isTopDialog(dialog) {
		return activeDialogs.length > 0 && activeDialogs[activeDialogs.length - 1] === dialog;
	}

	function removeFromActiveDialogs(dialog) {
		activeDialogs = activeDialogs.filter(function(item) {
			return item !== dialog;
		});
	}

	function getActiveElement() {
		try {
			return document.activeElement;
		} catch (error) {
			return null;
		}
	}

	function getDialogForElement(el) {
		if (!el || typeof el.closest !== 'function') return null;
		const modalEl = el.closest('.rc-dialog');
		if (!modalEl) return null;
		for (let i = activeDialogs.length - 1; i >= 0; i--) {
			if (activeDialogs[i].modalEl === modalEl && isDialogUsableAsOpener(activeDialogs[i])) return activeDialogs[i];
		}
		return null;
	}

	function markDialogInteraction(dialog) {
		if (!dialog || dialog.closed) return;
		lastInteractionDialog = dialog;
		lastInteractionTime = Date.now();
	}

	function getRecentInteractionDialog() {
		if (!isDialogUsableAsOpener(lastInteractionDialog)) return null;
		if (activeDialogs.indexOf(lastInteractionDialog) === -1) return null;
		if (Date.now() - lastInteractionTime > STACK_INTERACTION_WINDOW_MS) return null;
		return lastInteractionDialog;
	}

	function isDialogUsableAsOpener(dialog) {
		return !!(dialog && !dialog.closed && !dialog.closing);
	}

	function restoreFocus(el) {
		if (el === false) return;
		if (!el || typeof el.focus !== 'function') return;
		if (!document.documentElement.contains(el)) return;
		setTimeout(function() {
			try {
				el.focus();
			} catch (error) {}
		}, 0);
	}

	function isNode(value) {
		return value && typeof value === 'object' && typeof value.nodeType === 'number';
	}

	function isJQueryObject(value) {
		return value && typeof value === 'object' && typeof value.jquery === 'string' && typeof value.length === 'number';
	}

	function isPromiseLike(value) {
		return value && typeof value.then === 'function';
	}

	function clamp(value, min, max) {
		if (max < min) return min;
		return Math.min(Math.max(value, min), max);
	}

	function hasOwn(obj, key) {
		return Object.prototype.hasOwnProperty.call(obj, key);
	}

	function assign(target) {
		for (let i = 1; i < arguments.length; i++) {
			const source = arguments[i];
			if (!source) continue;
			Object.keys(source).forEach(function(key) {
				target[key] = source[key];
			});
		}
		return target;
	}

	function clone(obj) {
		return assign({}, obj);
	}

	function escapeHtml(value) {
		if (value == null) return '';
		return ('' + value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function stripHtml(value) {
		const el = document.createElement('div');
		el.innerHTML = value == null ? '' : '' + value;
		return el.textContent || el.innerText || '';
	}

	function configError(message) {
		return new Error('rcDialog: ' + message);
	}

	function logError(error) {
		if (window.console && typeof window.console.error === 'function') {
			window.console.error(error);
		}
	}
	//#endregion

	//#region Styles and export
	function ensureStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.type = 'text/css';
		style.appendChild(document.createTextNode([
			'.rc-dialog{--rc-dialog-intent-color:var(--bs-primary,#0d6efd);--rc-dialog-intent-rgb:13,110,253;--rc-dialog-focused-outline-color:var(--rc-dialog-intent-color);--rc-dialog-header-background-color:rgba(var(--rc-dialog-intent-rgb),.1);}',
			'.rc-dialog.rc-dialog-intent-primary{--rc-dialog-intent-color:var(--bs-primary,#0d6efd);--rc-dialog-intent-rgb:13,110,253;}',
			'.rc-dialog.rc-dialog-intent-success{--rc-dialog-intent-color:var(--bs-success,#198754);--rc-dialog-intent-rgb:25,135,84;}',
			'.rc-dialog.rc-dialog-intent-warning{--rc-dialog-intent-color:var(--bs-warning,#ffc107);--rc-dialog-intent-rgb:255,193,7;}',
			'.rc-dialog.rc-dialog-intent-danger{--rc-dialog-intent-color:var(--bs-danger,#dc3545);--rc-dialog-intent-rgb:220,53,69;}',
			'.rc-dialog.rc-dialog-intent-error{--rc-dialog-intent-color:var(--bs-danger,#dc3545);--rc-dialog-intent-rgb:220,53,69;}',
			'.rc-dialog.rc-dialog-intent-info{--rc-dialog-intent-color:var(--bs-info,#0dcaf0);--rc-dialog-intent-rgb:13,202,240;}',
			'.rc-dialog-backdrop{--bs-backdrop-opacity:.3;}',
			'.rc-dialog-parent-backdrop{--bs-backdrop-bg:#000;--bs-backdrop-opacity:.3;position:fixed;z-index:1055;background:var(--bs-backdrop-bg);opacity:var(--bs-backdrop-opacity);pointer-events:none;}',
			'.rc-dialog.rc-dialog-draggable-shell{overflow-x:auto;}',
			'.rc-dialog .rc-dialog-content{position:relative;border-radius:6px;}',
			'.rc-dialog .rc-dialog-resize-handle{position:absolute;z-index:4;background-color:var(--bs-modal-border-color,rgba(0,0,0,.2));opacity:0;touch-action:none;transition:opacity .12s ease;}',
			'.rc-dialog .rc-dialog-resize-handle:hover,.rc-dialog .rc-dialog-resize-handle.rc-dialog-resize-active{opacity:.6;}',
			'.rc-dialog .rc-dialog-resizing{user-select:none;}',
			'.rc-dialog .rc-dialog-resize-bottom{left:0;right:0;bottom:0;height:5px;cursor:ns-resize;}',
			'.rc-dialog .rc-dialog-resize-right{top:0;right:0;bottom:0;width:5px;cursor:ew-resize;}',
			'.rc-dialog .rc-dialog-resize-corner{right:0;bottom:0;width:15px;height:15px;background-color:transparent;opacity:1;cursor:nwse-resize;}',
			'.rc-dialog .rc-dialog-resize-corner:hover,.rc-dialog .rc-dialog-resize-corner.rc-dialog-resize-active{opacity:1;}',
			'.rc-dialog .rc-dialog-resize-corner:before{content:"";position:absolute;inset:0;background-color:var(--bs-modal-border-color,rgba(0,0,0,.2));opacity:0;clip-path:polygon(100% 0,100% 100%,0 100%);transition:opacity .12s ease;}',
			'.rc-dialog .rc-dialog-resize-corner:hover:before,.rc-dialog .rc-dialog-resize-corner.rc-dialog-resize-active:before{opacity:.6;}',
			'.rc-dialog .rc-dialog-resize-corner-marker{position:absolute;z-index:5;right:2px;bottom:2px;width:8px;height:8px;border-right:1px solid var(--bs-modal-border-color,rgba(0,0,0,.2));border-bottom:1px solid var(--bs-modal-border-color,rgba(0,0,0,.2));border-radius:0 0 5px 0;background:transparent;opacity:1;pointer-events:none;}',
			'.rc-dialog .rc-dialog-centered-parent-pending{visibility:hidden;}',
			'.rc-dialog:focus-within .rc-dialog-content{outline:2px solid var(--rc-dialog-focused-outline-color);outline-offset:-2px;}',
			'.rc-dialog.rc-dialog-tab-focus-within .rc-dialog-content{outline:2px solid var(--rc-dialog-focused-outline-color);outline-offset:-2px;}',
			'.rc-dialog .rc-dialog-header{display:flex;flex-direction:column;align-items:stretch;gap:0;padding:0;background-color:var(--rc-dialog-header-background-color);border-top-left-radius:inherit;border-top-right-radius:inherit;}',
			'.rc-dialog .rc-dialog-header-row{display:flex;align-items:flex-start;gap:12px;width:100%;}',
			'.rc-dialog .rc-dialog-title-area{display:flex;align-items:flex-start;gap:10px;min-width:0;flex:1;margin:.75rem 1rem;font-size:14px;}',
			'.rc-dialog .rc-dialog-icon{font-size:14px;line-height:1.3;margin-top:3px;color:#555;}',
			'.rc-dialog.rc-dialog-intent-primary .rc-dialog-icon{color:#0d6efd;}',
			'.rc-dialog.rc-dialog-intent-success .rc-dialog-icon{color:#198754;}',
			'.rc-dialog.rc-dialog-intent-warning .rc-dialog-icon{color:#997404;}',
			'.rc-dialog.rc-dialog-intent-danger .rc-dialog-icon{color:#b02a37;}',
			'.rc-dialog.rc-dialog-intent-error .rc-dialog-icon{color:#b02a37;}',
			'.rc-dialog.rc-dialog-intent-info .rc-dialog-icon{color:#087990;}',
			'.rc-dialog .rc-dialog-title-text{min-width:0;flex:1;}',
			'.rc-dialog .rc-dialog-title{font-size:18px;font-weight:600;line-height:1.25;margin:0;color:#333;overflow-wrap:anywhere;}',
			'.rc-dialog .rc-dialog-subtitle{font-size:13px;line-height:1.35;color:#666;margin-top:3px;overflow-wrap:anywhere;}',
			'.rc-dialog .rc-dialog-close{margin:1px 3px 0 auto;border:0;background:transparent;color:#333;opacity:.55;font-size:22px;line-height:1;padding:2px 4px;}',
			'.rc-dialog .rc-dialog-close:hover,.rc-dialog .rc-dialog-close:focus{opacity:.9;}',
			'.rc-dialog .rc-dialog-close[disabled]{opacity:.25;cursor:not-allowed;}',
			'.rc-dialog .rc-dialog-page-label{width:100%;padding:0 1rem .35rem 1rem;font-size:12px;line-height:1.2;color:#666;text-align:right;white-space:nowrap;}',
			'.rc-dialog .rc-dialog-progress-wrap{padding:0;width:100%;border-bottom:1px solid #ddd;}',
			'.rc-dialog .rc-dialog-progress{height:8px;border-radius:0;}',
			'.rc-dialog .rc-dialog-progress-bar{min-width:1px;border-radius:0;}',
			'.rc-dialog .rc-dialog-body{font-size:14px;line-height:1.45;}',
			'.rc-dialog .rc-dialog-body-tabbed{display:flex;flex-direction:column;overflow:hidden;}',
			'.rc-dialog .rc-dialog-tabs{display:flex;flex:1 1 auto;flex-direction:column;min-width:0;min-height:0;}',
			'.rc-dialog .rc-dialog-tabs-before{flex:0 0 auto;margin-bottom:.75rem;}',
			'.rc-dialog .rc-dialog-tabs-after{flex:0 0 auto;margin-top:.75rem;}',
			'.rc-dialog .rc-dialog-tab-strip{position:relative;flex:0 0 auto;min-width:0;}',
			'.rc-dialog .rc-dialog-tab-line{position:absolute;left:calc(-1rem + 1px);right:calc(-1rem + 1px);bottom:0;border-bottom:1px solid #bbb;pointer-events:none;}',
			'.rc-dialog .rc-dialog-tab-scroll{position:relative;z-index:1;max-width:100%;padding-top:2px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;}',
			'.rc-dialog .rc-dialog-tab-scroll::-webkit-scrollbar{display:none;}',
			'.rc-dialog .rc-dialog-tab-strip-has-left .rc-dialog-tab-scroll{-webkit-mask-image:linear-gradient(to right,transparent 0,#000 30px,#000 100%);mask-image:linear-gradient(to right,transparent 0,#000 30px,#000 100%);}',
			'.rc-dialog .rc-dialog-tab-strip-has-right .rc-dialog-tab-scroll{-webkit-mask-image:linear-gradient(to right,#000 0,#000 calc(100% - 30px),transparent 100%);mask-image:linear-gradient(to right,#000 0,#000 calc(100% - 30px),transparent 100%);}',
			'.rc-dialog .rc-dialog-tab-strip-has-left.rc-dialog-tab-strip-has-right .rc-dialog-tab-scroll{-webkit-mask-image:linear-gradient(to right,transparent 0,#000 30px,#000 calc(100% - 30px),transparent 100%);mask-image:linear-gradient(to right,transparent 0,#000 30px,#000 calc(100% - 30px),transparent 100%);}',
			'.rc-dialog .rc-dialog-tab-scroll-indicator{position:absolute;z-index:2;top:50%;transform:translateY(-35%);display:flex;align-items:center;justify-content:center;width:20px;height:24px;padding:0;border:0;background:transparent;color:#555;font-size:13px;line-height:1;opacity:0;pointer-events:none;cursor:pointer;text-align:center;text-decoration:none;appearance:none;-webkit-appearance:none;transition:opacity .12s ease,color .12s ease;}',
			'.rc-dialog .rc-dialog-tab-scroll-indicator-left{left:calc(-1rem + 3px);}',
			'.rc-dialog .rc-dialog-tab-scroll-indicator-right{right:calc(-1rem + 3px);}',
			'.rc-dialog .rc-dialog-tab-scroll-indicator:hover,.rc-dialog .rc-dialog-tab-scroll-indicator:focus{color:#333;text-decoration:none;}',
			'.rc-dialog .rc-dialog-tab-scroll-indicator[disabled]{cursor:default;}',
			'.rc-dialog .rc-dialog-tab-scroll-indicator i{pointer-events:none;}',
			'.rc-dialog .rc-dialog-tab-strip-has-left .rc-dialog-tab-scroll-indicator-left,.rc-dialog .rc-dialog-tab-strip-has-right .rc-dialog-tab-scroll-indicator-right{opacity:.78;pointer-events:auto;}',
			'.rc-dialog .rc-dialog-tab-list{--bs-nav-link-color:#393733;--bs-nav-tabs-border-color:#bbb;--bs-nav-tabs-link-hover-border-color:#bbb #bbb #bbb;--bs-nav-tabs-link-active-border-color:#bbb #bbb #fff;flex-wrap:nowrap;width:max-content;min-width:100%;margin-bottom:0;border-bottom:0;}',
			'.rc-dialog .rc-dialog-tab-item{flex:0 0 auto;margin:1px 1px 0 1px;}',
			'.rc-dialog .rc-dialog-tab-link{display:flex;align-items:center;gap:6px;white-space:nowrap;}',
			'.rc-dialog .rc-dialog-tab-link:hover,.rc-dialog .rc-dialog-tab-link:focus{border-color:#bbb #bbb #bbb;}',
			'.rc-dialog .rc-dialog-tab-link.active{border-color:#bbb #bbb #fff;}',
			'.rc-dialog .rc-dialog-tab-link:not(.active){background-color:#f4f4f4;border-bottom-color:#bbb;}',
			'.rc-dialog .rc-dialog-tab-link.disabled{cursor:not-allowed;}',
			'.rc-dialog .rc-dialog-tab-icon{font-size:13px;}',
			'.rc-dialog .rc-dialog-tab-content{display:flex;flex:1 1 auto;min-height:0;overflow:hidden;border:0;border-radius:0;padding:.75rem 0 0 0;}',
			'.rc-dialog .rc-dialog-tab-pane{width:100%;min-height:0;overflow:auto;}',
			'.rc-dialog .rc-dialog-tab-pane.active{flex:1 1 auto;}',
			'.rc-dialog .rc-dialog-footer{display:flex;align-items:center;justify-content:space-between;gap:0;flex-wrap:nowrap;padding:.5rem 1rem;}',
			'.rc-dialog .rc-dialog-footer:before,.rc-dialog .rc-dialog-footer:after{display:none;}',
			'.rc-dialog .rc-dialog-footer-status{flex:1 1 auto;min-width:0;margin-right:1rem;font-size:12px;line-height:1.35;color:#666;overflow-wrap:anywhere;}',
			'.rc-dialog .rc-dialog-footer-actions{display:flex;justify-content:flex-end;gap:8px;flex:0 0 auto;flex-wrap:wrap;margin-left:auto;}',
			'.rc-dialog .rc-dialog-button{min-width:72px;}',
			'.rc-dialog .rc-dialog-split-button{display:inline-flex;}',
			'.rc-dialog .rc-dialog-split-toggle{min-width:auto;padding-left:8px;padding-right:8px;}',
			'.rc-dialog .rc-dialog-button-icon{margin-right:6px;}',
			'.rc-dialog .rc-dialog-dropdown-item .rc-dialog-button-icon{width:16px;text-align:center;}',
			'.rc-dialog .rc-dialog-spinner{display:inline-block;width:12px;height:12px;margin-right:7px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;vertical-align:-1px;animation:rc-dialog-spin .65s linear infinite;}',
			'.rc-dialog .rc-dialog-draggable .rc-dialog-header{cursor:move;user-select:none;}',
			'.rc-dialog .rc-dialog-fullscreen{width:calc(100% - 20px);max-width:none;height:calc(100% - 20px);margin:10px;}',
			'.rc-dialog .rc-dialog-fullscreen .rc-dialog-content{height:100%;}',
			'.rc-dialog .rc-dialog-fullscreen .rc-dialog-body{overflow:auto;}',
			'@keyframes rc-dialog-spin{to{transform:rotate(360deg);}}'
		].join('\n')));
		document.head.appendChild(style);
	}

	window.rcDialog = rcDialog;
	//#endregion
})(window, document);
