// Extend the Bootstrap global defaults
bootstrap.Tooltip.Default.allowList.kbd = [];
bootstrap.Popover.Default.allowList.kbd = []; // if you also use Popovers

var isNumeric    = function(n){return !isNaN(parseFloat(n)) && isFinite(n);};
var isNumericComma = function(n){n=n.replace(',','.');return isNumeric(n);};
var bypassBranchingErrors = false;
var currentFocusTextField = null;
function chkNull(val, is_branching_logic)
{
	if (typeof is_branching_logic == 'undefined') is_branching_logic = 0;
	// If object, replace with string
	if (typeof val == 'object') {
		val = val.value;
	}
	// Replace comma decimal with dot
	if (isNumericComma(val)) {
		val = val.replace(',','.');
	}
	// If this is referenced in branching logic (as opposed to a calc field) and the value is a Missing Data Code, then return the value as-is.
	// if (is_branching_logic && missing_data_codes_check && in_array(val, missing_data_codes)) {
	if (missing_data_codes_check && in_array(val, missing_data_codes)) {
		return val;
	}
	// Return the value as a number data type or as 'NaN'
	return (val !== '0' && val !== 0 && (val == 'NaN' || val == '' || val==null || isNaN(val) || !isNumeric(val)) ? 'NaN' : (val*1) );
}

// Return boolean if val is a number (integer or floating point)
function isnumber(val) {
	// Check if the value is a number or a numeric string
	if (!isNumeric(val)) {
		return false;
	}
	// Convert the value to a string
	val = val.toString();
	// Check if the string is a valid number
	if (isNaN(val)) {
		return false;
	}
	// If begins with + or -, which is allowable, then remove that character for further processing
	let firstChar = val.charAt(0);
	if (firstChar === "+" || firstChar === "-") {
		val = val.substring(1);
	}
	// Check for leading zeros (excluding the case where the value is "0")
	if (val.length > 1 && val.charAt(0) === '0' && !val.includes(".")) {
		return false;
	}
	// Check for multiple leading zeros
	if (val.length >= 2 && val.substring(0, 2) === '00') {
		return false;
	}
	// Passed all checks, return true
	return true;
}

// Return boolean if val is a number (integer or floating point)
function isinteger(val) {
	var regex = /^[-+]?\b\d+\b$/
	return (isNumeric(val) && regex.test(val));
}

// Convert date format from DD-MM-YYYY to YYYY-MM-DD
function date_dmy2ymd(val)
{
	val = trim(val);
	if (val == '') return val;
	var time = '';
	if (val.indexOf(' ') > -1) {
		var datetime_arr = val.split(' ');
		val = datetime_arr[0];
		time = ' '+datetime_arr[1];
	}
	var date_arr = val.split('-');
	if (date_arr.length != 3) return '';
	if (date_arr[0].length < 2) date_arr[0] = "0" + date_arr[0];
	if (date_arr[1].length < 2) date_arr[1] = "0" + date_arr[1];
	return date_arr[2]+"-"+date_arr[1]+"-"+date_arr[0]+time;
}
// Convert date format from MM-DD-YYYY to YYYY-MM-DD
function date_mdy2ymd(val)
{
	val = trim(val);
	if (val == '') return '';
	var time = '';
	if (val.indexOf(' ') > -1) {
		var datetime_arr = val.split(' ');
		val = datetime_arr[0];
		time = ' '+datetime_arr[1];
	}
	var date_arr = val.split('-');
	if (date_arr.length != 3) return '';
	if (date_arr[0].length < 2) date_arr[0] = "0" + date_arr[0];
	if (date_arr[1].length < 2) date_arr[1] = "0" + date_arr[1];
	return date_arr[2]+"-"+date_arr[0]+"-"+date_arr[1]+time;
}
// Convert date format from YYYY-MM-DD to DD-MM-YYYY
function date_ymd2dmy(val)
{
	val = trim(val);
	if (val == '') return val;
	var time = '';
	if (val.indexOf(' ') > -1) {
		var datetime_arr = val.split(' ');
		val = datetime_arr[0];
		time = ' '+datetime_arr[1];
	}
	var date_arr = val.split('-');
	if (date_arr.length != 3) return '';
	if (date_arr[1].length < 2) date_arr[1] = "0" + date_arr[1];
	if (date_arr[2].length < 2) date_arr[2] = "0" + date_arr[2];
	return date_arr[2]+"-"+date_arr[1]+"-"+date_arr[0]+time;
}
// Convert date format from YYYY-MM-DD to MM-DD-YYYY
function date_ymd2mdy(val)
{
	val = trim(val);
	if (val == '') return '';
	var time = '';
	if (val.indexOf(' ') > -1) {
		var datetime_arr = val.split(' ');
		val = datetime_arr[0];
		time = ' '+datetime_arr[1];
	}
	var date_arr = val.split('-');
	if (date_arr.length != 3) return '';
	if (date_arr[1].length < 2) date_arr[1] = "0" + date_arr[1];
	if (date_arr[2].length < 2) date_arr[2] = "0" + date_arr[2];
	return date_arr[1]+"-"+date_arr[2]+"-"+date_arr[0]+time;
}
/**
 * Registers a change to a field's value
 * @param {string} field 
 */
function setDataEntryFormValuesChanged(field) {
	if (field == '') return;
	// On data entry forms, check if the field will be hidden
	if (!is_survey() && document.getElementById('icon-showfield-'+field) != null) {
		doBranching(field);
	}
	var changeTrackingOff = dataEntryFormValuesChangedNeverTrack || $('tr[sq_id="'+field+'"]').hasClass('\@SAVE-PROMPT-EXEMPT');
	if (!changeTrackingOff) {
		dataEntryFormValuesChanged = true;
	}
}
// Notify user that contents of field theField are invalid.
// String s describes expected contents of theField.value.
// Put select theField, pu focus in it, and return false.
function warnInvalid (theField, s)
{
	theField.style.fontWeight = 'bold';
	theField.style.backgroundColor='#FFB7BE';
	// Set id for regex validation dialog div
	var valPopupId = 'redcapValidationErrorPopup';
	// Get ID of field: If field does not have an id, then given it a random one so later we can reference it directly.
	var obId = $(theField).attr('id');
	if (obId == null) {
		obId = "val-"+Math.floor(Math.random()*10000000000000000);
		$(theField).attr('id', obId);
	}
	// Set the Javascript for returning focus back on element (if specified)
	setTimeout(function(){
		simpleDialog(s, null,valPopupId, null, "$('#"+obId+"').focus();");
		$('#'+valPopupId).parent().find('button:first').focus();
	},10);
	return false;
}

// For date fields (any format type), replace any periods or slashes in the date with a dash and add any leading zeros.
function redcap_clean_date(this_date,texttype)
{
	if (this_date == '') return '';
	// Replace periods and slashes with dashes
	var this_date = this_date.replace(/[.\/]/g,'-');
	// Check to make sure 2 dashes exist. If not, return current value, unless an eight digit number, in which case add dashes.
	if (this_date.split('-').length == 1) {
		if (this_date.length == 8) { // Assuming have all 8 digits
			if (/_ymd/.test(texttype)) {
				this_date = this_date.substr(0,4)+"-"+this_date.substr(4,2)+"-"+this_date.substr(6,2);
			} else {
				this_date = this_date.substr(0,2)+"-"+this_date.substr(2,2)+"-"+this_date.substr(4,4);
			}
		} else if (this_date.length == 6) { // Assuming have all 4 digits of year but 1 for month and day
			if (/_ymd/.test(texttype)) {
				this_date = this_date.substr(0,4)+"-0"+this_date.substr(4,1)+"-0"+this_date.substr(5,1);
			} else {
				this_date = "0"+this_date.substr(0,1)+"-0"+this_date.substr(1,1)+"-"+this_date.substr(2,4);
			}
		} else {
			// Can't figure out the format
			return this_date;
		}
	} else if (this_date.split('-').length != 3) {
		// Can't figure out the format
		return this_date;
	}
	// Make sure has leading zeros
	var date_arr = this_date.split('-');
	if (date_arr[1].length < 2) date_arr[1] = "0" + date_arr[1];
	if (/_mdy/.test(texttype) || /_dmy/.test(texttype)) {
		if (date_arr[0].length < 2) date_arr[0] = "0" + date_arr[0];
		var year = date_arr[2];
	} else {
		if (date_arr[2].length < 2) date_arr[2] = "0" + date_arr[2];
		var year = date_arr[0];
	}
	// Make sure year has 4 digits
	if (year.length == 2) {
		var this_year_2d = "" + new Date().getFullYear();
		this_year_2d = this_year_2d.substring(2)*1;
		year = (year <= (this_year_2d+10)) ? (year-0+2000) : (year-0+1900);
		if (/_mdy/.test(texttype) || /_dmy/.test(texttype)) {
			date_arr[2] = year;
		} else {
			date_arr[0] = year;
		}
	}
	// Return formatted date
	return date_arr[0]+"-"+date_arr[1]+"-"+date_arr[2];
}

// For date/datetime fields (any format type), replace any periods or slashes in the date with a dash and add any leading zeros.
function clean_datetime(ob,texttype)
{
	if (texttype == '' || $(ob).val() == '') return;
	if (texttype=="date_ymd" || texttype=="date_mdy" || texttype=="date_dmy") {
		$(ob).val(redcap_clean_date($(ob).val(),texttype));
	} else if (texttype=="datetime_ymd" || texttype=="datetime_mdy" || texttype=="datetime_dmy"
		|| texttype=="datetime_seconds_ymd" || texttype=="datetime_seconds_mdy" || texttype=="datetime_seconds_dmy") {
		var dt_array = $(ob).val().split(' ');
		if (dt_array[1] == null) dt_array[1] = '';
		var thisdate = redcap_clean_date(dt_array[0],texttype);
		var thistime = redcap_pad_time(dt_array[1]);
		$(ob).val(trim(thisdate+' '+thistime));
	}
}

// Make sure all times (HH:MM[:SS]) have zeroes padding)
function redcap_pad_time(time) {
	// Break into components
	var time_comp = time.split(':');
	// Make sure each component is padded with a zero if only one digit long
	for (var i=0; i<time_comp.length; i++) {
		if (time_comp[i].length < 2) {
			time_comp[i] = "0" + time_comp[i];
		}
	}
	// Return time
	return time_comp.join(':');
}

// REDCap form validation function
function redcap_validate(ob, min, max, returntype, texttype, regexVal, returnFocus, dateDelimiterReturned)
{
	var haveSameParent = function(el1, el2, selector) {
		var parent1 = $(el1).parents(selector);
		var parent2 = $(el2).parents(selector);
		if(parent1.length==0 || parent2.length==0) return false
		var same = parent1[0]==parent2[0];
		return same;
	};
	var return_value;
	var kickout_message;
	var holder1;
	var holder2;
	var holder3;
	var origVal;

	// If the field is a date/tme field with min or max = "now", then use current now (as of this second) instead of global var "now"
	var now = getCurrentDate('datetime')+' '+currentTime('both',true);

	// Reset flag on page
	$('#field_validation_error_state').val('0');

	// If blank or has a valid missing data code (but does not have @NOMISSING action tag), do nothing
	if (ob.value == '' || (in_array(ob.value, missing_data_codes)
		&& ($(ob).attr('name') == null || ($(ob).attr('name') != null && !$('#'+$(ob).attr('name')+'-tr').hasClass('@NOMISSING')))))
	{
		ob.style.fontWeight = 'normal';
		ob.style.backgroundColor='#FFFFFF';
		return true;
	}
	origVal = ob.value;
	
	// If datetime-picker was just clicked, do nothing because onblur will check this later
	try {
		
		if (typeof object_clicked == 'object' && haveSameParent(ob, object_clicked, 'tr') && (object_clicked.hasClass('ui-datepicker-trigger') || object_clicked.parents('.ui-datepicker:visible').length > 0)) {
			ob.style.fontWeight = 'normal';
			ob.style.backgroundColor='#FFFFFF';
			return true;
		}
	} catch(e) { }

	// Get ID of field: If field does not have an id, then given it a random one so later we can reference it directly.
	var obId = $(ob).attr('id');
	if (obId == null) {
		obId = "val-"+Math.floor(Math.random()*10000000000000000);
		$(ob).attr('id', obId);
	}

	// Set the Javascript for returning focus back on element (if specified)
	if (returnFocus == null) returnFocus = 1;
	var returnFocusJS = (returnFocus == 1) ? "$('#"+obId+"').focus();" : "";

	//REGULAR EXPRESSION
	if (regexVal != null)
	{
		// Before evaluating with regex, first do some cleaning
		ob.value = trim(ob.value);

		// Set id for regex validation dialog div
		var regexValPopupId = 'redcapValidationErrorPopup';

		// If the branching logic "erase values" prompt is visible, do not display the field validation error dialog (otherwise it'll trap the user)
		if ($('#erase-values-branching-dialog:visible').length) {
			return;
		}

		// For date[time][_seconds] fields, replace any periods or slashes with a dash. Add any leading zeros.
		if (texttype=="date_ymd" || texttype=="date_mdy" || texttype=="date_dmy") {
			ob.value = redcap_clean_date(ob.value,texttype);
			if (ob.value.split('-').length == 2) {
				// If somehow contains just one dash, then remove the dash and re-validate it to force reformatting
				return $(ob).val(ob.value.replace(/-/g,'')).trigger('blur');
			}
			var thisdate = ob.value;
			var thistime = '';
		} else if (texttype=="datetime_ymd" || texttype=="datetime_mdy" || texttype=="datetime_dmy"
				|| texttype=="datetime_seconds_ymd" || texttype=="datetime_seconds_mdy" || texttype=="datetime_seconds_dmy") {
			var dt_array = ob.value.split(' ');
			if (dt_array[1] == null) dt_array[1] = '';
			var thisdate = redcap_clean_date(dt_array[0],texttype);
			var thistime = redcap_pad_time(dt_array[1]);
			ob.value = trim(thisdate+' '+thistime);
			if (ob.value.split('-').length == 2) {
				// If somehow contains just one dash, then remove the dash and re-validate it to force reformatting
				return $(ob).val(ob.value.replace(/-/g,'')).trigger('blur');
			}
		}

		// Obtain regex info from REDCap (some info is stored in hidden divs on the page)
		var regexDataType = '';
		if (regexVal === 1) {
			if (typeof window['REDCap']['validations'][texttype] == 'undefined') {
				// This validation type does not exist on this server, so it must be custom. Return true to prevent errors.
				return true;
			}
			regexVal = window.REDCap.validations[texttype].regex;
			regexDataType = window.REDCap.validations[texttype].datatype;
		}
		
		// Evaluate value with regex
		eval('var regexVal2 = '+regexVal+';');
		if (regexVal2.test(ob.value))
		{
			// Passed the regex test!

			// Reformat phone format, if needed
			if (texttype=="phone") {
				ob.value = ob.value.replace(/-/g,"").replace(/ /g,"").replace(/\(/g,"").replace(/\)/g,"").replace(/\./g,"");
				if (ob.value.length > 10) {
					ob.value = trim(reformatUSPhone(ob.value.substr(0,10))+" "+trim(ob.value.substr(10)));
				} else {
					ob.value = reformatUSPhone(ob.value);
				}
			}
			// Make sure time has a leading zero if hour is single digit
			else if (texttype=="time" && ob.value.length == 4) {
				ob.value = "0"+ob.value;
			}
			// If a date[time] field and the returnDelimiter is specified, then do a delimiter replace
			else if (dateDelimiterReturned != null && dateDelimiterReturned != '-' && (texttype.substring(0,5) == 'date_' || texttype.substring(0,9) == 'datetime_')) {
				ob.value = ob.value.replace(/-/g, dateDelimiterReturned);
			}

			// If the value has been reformatted above, then we run calculate() and doBranching() for this field based on its NEW value.
			if (origVal != ob.value) {
				try{ calculate($(ob).attr('name')); doBranching($(ob).attr('name')); }catch(e){ }
			}

			// Remove datepicker if user selects date/datetime and get out from datepicker popup either by clicking outside (without pressing Done button of datepicker) OR pressing 'tab'
			if (tab_pressed
				|| (object_clicked != null
					&& typeof object_clicked == 'object'
					&& object_clicked.parents('.ui-datepicker:visible').length == 0
					&& $('#ui-datepicker-div:visible').length)
			) {
				$('#ui-datepicker-div').hide();
			}

			// If a date/time field, check if its datepicker widget is opened
			var hasDatePicker = $(ob).parentsUntil('tr').find('.ui-datepicker-trigger').length;
			var hasDataPickerOpened = hasDatePicker ? $('#ui-datepicker-div:visible').length : false;

			// Now do range check (if needed) for various validation types
			if ((min != '' || max != '') && !hasDataPickerOpened)
			{
				holder1 = ob.value;
				if (typeof min == 'function') eval("var min = "+min);
				if (typeof max == 'function') eval("var max = "+max);
				holder2 = min;
				holder3 = max;

				// Range check - integer/number
				if (texttype=="integer" || texttype=="number" || regexDataType=="integer" || regexDataType=="number" || regexDataType=="number_comma_decimal")
				{
					holder1 = (holder1.replace(',','.'))*1;
					holder2 = (holder2==='') ? '' : (holder2.replace(',','.'))*1;
					holder3 = (holder3==='') ? '' : (holder3.replace(',','.'))*1;``
				}
				// Range check - time
				else if (texttype=="time" || texttype=="time_hh_mm_ss" || texttype=="time_mm_ss")
				{
					// If using "now" for min/max, convert to literal time for comparison purposes
					if (texttype=="time_hh_mm_ss") {
						if (holder2 == 'now') min = holder2 = now.substring(11, 19);
						if (holder3 == 'now') max = holder3 = now.substring(11, 19);
					} else if (texttype=="time_mm_ss") {
						if (holder2 == 'now') min = holder2 = now.substring(14, 19);
						if (holder3 == 'now') max = holder3 = now.substring(14, 19);
					} else {
						if (holder2 == 'now') min = holder2 = now.substring(11, 16);
						if (holder3 == 'now') max = holder3 = now.substring(11, 16);
					}
					// Remove all non-numerals so we can compare them numerically
					holder1 = (holder1.replace(/:/g,""))*1;
					holder2 = (holder2==='') ? '' : (holder2.replace(/:/g,""))*1;
					holder3 = (holder3==='') ? '' : (holder3.replace(/:/g,""))*1;
				}
				// Range check - date[time][_seconds]
				else if (texttype=="date_ymd" || texttype=="date_mdy" || texttype=="date_dmy"
					|| texttype=="datetime_ymd" || texttype=="datetime_mdy" || texttype=="datetime_dmy"
					|| texttype=="datetime_seconds_ymd" || texttype=="datetime_seconds_mdy" || texttype=="datetime_seconds_dmy")
				{
					// If using "now" or "today" for min/max, convert to literal date/datetime for comparison purposes
					if (holder2 == 'now' || holder2 == 'today' || holder3 == 'now' || holder3 == 'today') {
						if (texttype.indexOf('datetime_seconds_') === 0) {
							// Datetime w/ seconds
							if (holder2 == 'now' || holder2 == 'today') holder2 = now;
							if (holder3 == 'now' || holder3 == 'today') holder3 = now;
						} else if (texttype.indexOf('datetime_') === 0) {
							// Datetime
							if (holder2 == 'now' || holder2 == 'today') holder2 = now.substring(0, 16);
							if (holder3 == 'now' || holder3 == 'today') holder3 = now.substring(0, 16);
						} else {
							// Date
							if (holder2 == 'now' || holder2 == 'today') holder2 = today;
							if (holder3 == 'now' || holder3 == 'today') holder3 = today;
						}
					}
					min = holder2;
					max = holder3;

					// Convert date format of value to YMD to compare with min/max, which are already in YMD format
					if (/_mdy/.test(texttype)) {
						holder1 = trim(date_mdy2ymd(thisdate)+' '+thistime);
						var min_array = min.split(' ');
						if (min_array[1] == null) min_array[1] = '';
						min = trim(date_ymd2mdy(min_array[0],texttype)+' '+min_array[1]);
						var max_array = max.split(' ');
						if (max_array[1] == null) max_array[1] = '';
						max = trim(date_ymd2mdy(max_array[0],texttype)+' '+max_array[1]);
					} else if (/_dmy/.test(texttype)) {
						holder1 = trim(date_dmy2ymd(thisdate)+' '+thistime);
						var min_array = min.split(' ');
						if (min_array[1] == null) min_array[1] = '';
						min = trim(date_ymd2dmy(min_array[0],texttype)+' '+min_array[1]);
						var max_array = max.split(' ');
						if (max_array[1] == null) max_array[1] = '';
						max = trim(date_ymd2dmy(max_array[0],texttype)+' '+max_array[1]);
					} else {
						holder1 = trim(thisdate+' '+thistime);
					}
					// Ensure that min/max are in YMD format (legacy values could've been in M/D/Y format)
					if (texttype.substr(0,5) == "date_") {
						holder2 = redcap_clean_date(holder2,"date_ymd");
						holder3 = redcap_clean_date(holder3,"date_ymd");
					}
					// Remove all non-numerals so we can compare them numerically
					holder1 = (holder1.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
					holder2 = (holder2==='') ? '' : (holder2.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
					holder3 = (holder3==='') ? '' : (holder3.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
				}

				// Check range
				if ((holder2 !== '' && holder1 < holder2) || (holder3 !== '' && holder1 > holder3)) {
					if (returntype == "hard") {
						var msg1 = ($('#valtext_divs #valtext_rangehard').length) ? $('#valtext_divs #valtext_rangehard').text() : 'The value you provided must be within the suggested range';
						var msg2 = '';
						$('#field_validation_error_state').val('1');
					} else {
						var msg1 = ($('#valtext_divs #valtext_rangesoft1').length) ? $('#valtext_divs #valtext_rangesoft1').text() : 'The value you provided is outside the suggested range';
						var msg2 = ($('#valtext_divs #valtext_rangesoft2').length) ? $('#valtext_divs #valtext_rangesoft2').text() : 'This value is admissible, but you may wish to verify.';
						returnFocusJS = '';
					}
					ob.style.backgroundColor='#FFB7BE';
					var msg = msg1 + ' (' + (min==''?'no limit':min) + ' - ' + (max==''?'no limit':max) +'). ' + msg2;
					$('#'+regexValPopupId).remove();
					initDialog(regexValPopupId);
					$('#'+regexValPopupId).html(msg);
					setTimeout(function(){
						simpleDialog(msg, null, regexValPopupId, null, returnFocusJS);
						$('#'+regexValPopupId).parent().find('button:first').focus();
					},10);
					return (returntype != "hard");
				}
			}
			// Not out of range, so leave the field as normal
			ob.style.fontWeight = 'normal';
			ob.style.backgroundColor='#FFFFFF';
			return true;
		}
		
		// Custom messages for legacy validation types
		var msg = ($('#valtext_divs #valtext_regex').length) ? $('#valtext_divs #valtext_regex').text() : 'The value you provided could not be validated because it does not follow the expected format. Please try again.';
		if (texttype=="zipcode") {
			msg = ($('#valtext_divs #valtext_zipcode').length) ? $('#valtext_divs #valtext_zipcode').text() : iZIPCode;
		} else if (texttype=="email") {
			msg = ($('#valtext_divs #valtext_email').length) ? $('#valtext_divs #valtext_email').text() : iEmail;
		} else if (texttype=="phone") {
			msg = ($('#valtext_divs #valtext_phone').length) ? $('#valtext_divs #valtext_phone').text() : iUSPhone;
		} else if (texttype=="integer") {
			msg = ($('#valtext_divs #valtext_integer').length) ? $('#valtext_divs #valtext_integer').text() : 'This value you provided is not an integer. Please try again.';
		} else if (texttype=="number") {
			msg = ($('#valtext_divs #valtext_number').length) ? $('#valtext_divs #valtext_number').text() : 'This value you provided is not a number. Please try again.';
		} else if (texttype=="vmrn") {
			msg = ($('#valtext_divs #valtext_vmrn').length) ? $('#valtext_divs #valtext_vmrn').text() : 'The value entered is not a valid Vanderbilt Medical Record Number (i.e. 4- to 9-digit number, excluding leading zeros). Please try again.';
		} else if (texttype=="time") {
			msg = ($('#valtext_divs #valtext_time').length) ? $('#valtext_divs #valtext_time').text() : 'The value entered must be a time value in the following format HH:MM within the range 00:00-23:59 (e.g., 04:32 or 23:19).';
		} else if ($('#valtext_divs #valtext_requiredformat').length && $('#valregex_divs #valregex-'+texttype).length) {
			// Set default generic message for failure
			msg += '<div class="fvallab">'+$('#valtext_divs #valtext_requiredformat').text()+' '
				+  $('#valregex_divs #valregex-'+texttype).attr('label')+'</div>';
		}
		
		// Because of strange syncronicity issues of back-to-back fields with validation, set pop-up content first here
		$('#'+regexValPopupId).remove();
		initDialog(regexValPopupId);
		$('#'+regexValPopupId).html(msg);
		// Give alert message of failure
		setTimeout(function(){
			// First, if the file upload/signature popup is somehow already displayed, close it (this seems to only occur on mobile devices)
			if ($("#file_upload:visible").length) $("#file_upload:visible").dialog('close');
			// Display field validation error popup
			simpleDialog(msg, null, regexValPopupId, null, returnFocusJS);
			$('#'+regexValPopupId).parent().find('button:first').focus();
		},10);
		ob.style.fontWeight = 'bold';
		ob.style.backgroundColor = '#FFB7BE';
		// Set flag on page
		$('#field_validation_error_state').val('1');
		return false;
	}

	//ZIPCODE
	if(texttype=="zipcode")
	{
		if ($('#valtext_divs #valtext_zipcode').length) iZIPCode = $('#valtext_divs #valtext_zipcode').text();
	    if (checkZIPCode(ob,true)) {
			ob.style.fontWeight = 'normal';
			ob.style.backgroundColor='#FFFFFF';
			return true;
		}
		return false;
	}

	//EMAIL
	if (texttype=="email")
    {
		if ($('#valtext_divs #valtext_email').length) iEmail = $('#valtext_divs #valtext_email').text();
		if (checkEmail(ob,true)) {
			ob.style.fontWeight = 'normal';
			ob.style.backgroundColor='#FFFFFF';
			return true;
		}
		return false;
	}

	//Phone
	if (texttype=="phone")
    {
		if ($('#valtext_divs #valtext_phone').length) iUSPhone = $('#valtext_divs #valtext_phone').text();
		if (checkUSPhone(ob,true)) {
			ob.style.fontWeight = 'normal';
			ob.style.backgroundColor='#FFFFFF';
			return true;
		}
		return false;
	}

	//Time (HH:MM)
	if (texttype=="time")
    {
		if (ob.value != "") {
			if (!isTime(ob.value,0)) {
				var msg = ($('#valtext_divs #valtext_time').length) ? $('#valtext_divs #valtext_time').text() : 'The value entered must be a time value in the following format HH:MM within the range 00:00-23:59 (e.g., 04:32 or 23:19).';
				simpleDialog(msg, null, null, null, returnFocusJS);
				ob.style.fontWeight = 'bold';
				ob.style.backgroundColor = '#FFB7BE';
				return false;
			}
			//Now handle limits
			holder1 = (ob.value.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
			holder2 = (min=='') ? '' : (min.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
			holder3 = (max=='') ? '' : (max.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
			if ((holder2 != '' && holder1 < holder2) || (holder3 != '' && holder1 > holder3)) {
				if(returntype=="hard") {
					var msg = ($('#valtext_divs #valtext_rangehard').length) ? $('#valtext_divs #valtext_rangehard').text() : 'The value you provided must be within the suggested range';
					simpleDialog(msg + ' (' + min + ' - ' + max +').', null, null, null, returnFocusJS);
					ob.style.backgroundColor='#FFB7BE';
				}
				else
				{
					var msg1 = ($('#valtext_divs #valtext_rangesoft1').length) ? $('#valtext_divs #valtext_rangesoft1').text() : 'The value you provided is outside the suggested range.';
					var msg2 = ($('#valtext_divs #valtext_rangesoft2').length) ? $('#valtext_divs #valtext_rangesoft2').text() : 'This value is admissible, but you may wish to verify.';
					simpleDialog(msg1 + ' (' + min + ' - ' + max +'). ' + msg2, null, null, null, returnFocusJS);
					ob.style.backgroundColor='#FFB7BE';
				}
			}
		}
		ob.style.fontWeight = 'normal';
		ob.style.backgroundColor='#FFFFFF';
		return true;
	}

	//Datetime (YYYY-MM-DD HH:MM) and Datetime w/ seconds (YYYY-MM-DD HH:MM:SS)
	if (texttype=="datetime" || texttype=="datetime_seconds")
    {
		if (ob.value != "") {
			var dt_array = ob.value.split(' ');
			var dt_date = dt_array[0];
			var dt_time = dt_array[1];
			var holder1 = parseDate(dt_date);
			var hasSeconds = (texttype=="datetime_seconds");
			if (!isTime(dt_time,hasSeconds) || holder1==null) {
				if (!hasSeconds) {
					var msg = ($('#valtext_divs #valtext_datetime').length) ? $('#valtext_divs #valtext_datetime').text() : 'The value entered must be a datetime value in the following format YYYY-MM-DD HH:MM with the time in the range 00:00-23:59.';
				} else {
					var msg = ($('#valtext_divs #valtext_datetime_seconds').length) ? $('#valtext_divs #valtext_datetime_seconds').text() : 'The value entered must be a datetime value in the following format YYYY-MM-DD HH:MM:SS with the time in the range 00:00:00-23:59:59.';
				}
				simpleDialog(msg, null, null, null, returnFocusJS);
				ob.style.fontWeight = 'bold';
				ob.style.backgroundColor = '#FFB7BE';
				return false;
			}
			ob.value=formatDate(holder1,'y-MM-dd')+' '+dt_time;
			//Now handle limits
			holder1 = (ob.value.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
			holder2 = (min=='') ? '' : (min.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
			holder3 = (max=='') ? '' : (max.replace(/:/g,"").replace(/ /g,"").replace(/-/g,""))*1;
			if ((holder2 != '' && holder1 < holder2) || (holder3 != '' && holder1 > holder3)) {
				if(returntype=="hard") {
					var msg = ($('#valtext_divs #valtext_rangehard').length) ? $('#valtext_divs #valtext_rangehard').text() : 'The value you provided must be within the suggested range';
					simpleDialog(msg + ' (' + min + ' - ' + max +').', null, null, null, returnFocusJS);
					ob.style.backgroundColor='#FFB7BE';
				}
				else
				{
					var msg1 = ($('#valtext_divs #valtext_rangesoft1').length) ? $('#valtext_divs #valtext_rangesoft1').text() : 'The value you provided is outside the suggested range.';
					var msg2 = ($('#valtext_divs #valtext_rangesoft2').length) ? $('#valtext_divs #valtext_rangesoft2').text() : 'This value is admissible, but you may wish to verify.';
					simpleDialog(msg1 + ' (' + min + ' - ' + max +'). ' + msg2, null, null, null, returnFocusJS);
					ob.style.backgroundColor='#FFB7BE';
				}
			}
		}
		ob.style.fontWeight = 'normal';
		ob.style.backgroundColor='#FFFFFF';
		return true;
	}

	//Dates
	if(texttype=="date")
	{
	    //if empty, let it go
		if(isEmpty(ob.value)){return true;}
	    var result;
	    var holder1 = parseDate(ob.value);
		if(holder1==null){
			var msg = ($('#valtext_divs #valtext_date').length) ? $('#valtext_divs #valtext_date').text() : 'The value entered in this field must be a date. You may use one of several formats (ex. YYYY-MM-DD or MM/DD/YYYY), but the final result must constitute a real date. Please try again.';
			simpleDialog(msg, null, null, null, returnFocusJS);
		    ob.style.fontWeight = 'bold';
			ob.style.backgroundColor='#FFB7BE';
	        return false;
		}
		holder1=formatDate(holder1,'y-MM-dd');
        ob.value=holder1;
        //Reset field style
		ob.style.fontWeight = 'normal';
		ob.style.backgroundColor='#FFFFFF';
		//Now handle limits
		holder2 = (!min=='') ? formatDate(parseDate(min),'y-MM-dd') : formatDate(parseDate(ob.value),'y-MM-dd');
		holder3 = (!max=='') ? formatDate(parseDate(max),'y-MM-dd') : formatDate(parseDate(ob.value),'y-MM-dd');
		if(compareDates(holder2,'y-MM-dd',holder1,'y-MM-dd')==1 || compareDates(holder1,'y-MM-dd',holder3,'y-MM-dd')==1){
			if(returntype=="hard") {
				var msg = ($('#valtext_divs #valtext_rangehard').length) ? $('#valtext_divs #valtext_rangehard').text() : 'The value you provided must be within the suggested range';
				simpleDialog(msg + ' (' + holder2 + ' - ' + holder3 +').', null, null, null, returnFocusJS);
				ob.style.backgroundColor='#FFB7BE';
			}
			else
			{
				var msg1 = ($('#valtext_divs #valtext_rangesoft1').length) ? $('#valtext_divs #valtext_rangesoft1').text() : 'The value you provided is outside the suggested range.';
				var msg2 = ($('#valtext_divs #valtext_rangesoft2').length) ? $('#valtext_divs #valtext_rangesoft2').text() : 'This value is admissible, but you may wish to verify.';
				simpleDialog(msg1 + ' (' + holder2 + ' - ' + holder3 +'). ' + msg2, null, null, null, returnFocusJS);
				ob.style.backgroundColor='#FFB7BE';
			}
			return true;
		}
		ob.style.fontWeight = 'normal';
		ob.style.backgroundColor='#FFFFFF';
		return true;
	}

	//Vanderbilt MRN
	if (texttype=="vmrn")
	{
		reformat_vanderbilt_mrn(ob); // Remove all non-numerals
		if (!is_vanderbilt_mrn(ob.value)) {
			var msg = ($('#valtext_divs #valtext_vmrn').length) ? $('#valtext_divs #valtext_vmrn').text() : 'The value entered is not a valid Vanderbilt Medical Record Number (i.e. 4- to 9-digit number, excluding leading zeros). Please try again.';
			simpleDialog(msg, null, null, null, returnFocusJS);
			ob.style.fontWeight = 'bold';
			ob.style.backgroundColor = '#FFB7BE';
			return false;
		} else {
			ob.style.fontWeight = 'normal';
			ob.style.backgroundColor='#FFFFFF';
			return true;
		}
	}

	//Numbers
	if (texttype=="int" ||texttype=="float")
    {
        //if empty, let it go
		if(isEmpty(ob.value)){return true;}
        var range_text;

		if(!min == '' && !max == ''){
	  			range_text = 'Range = ' + min + ' to ' + max;
	    } else {
	       	if(!min==''){
	            range_text = 'Minimum = ' + min;
	        } else {
	            range_text = max + ' = Maximum';
	        }
		}

		//First, make sure the type is correct
		if(texttype=="int")
		{
			return_value=isSignedInteger(ob.value,true);
			if(!return_value)
			{
				var msg = ($('#valtext_divs #valtext_integer').length) ? $('#valtext_divs #valtext_integer').text() : 'This value you provided is not an integer. Please try again.';
		    	simpleDialog(msg, null, null, null, returnFocusJS);
				ob.style.fontWeight = 'bold';
				ob.style.backgroundColor='#FFB7BE';
		        return false;
			}
		} else if(texttype=="float") {
			return_value=isSignedFloat(ob.value,true);
			if(!return_value)
			{
				var msg = ($('#valtext_divs #valtext_number').length) ? $('#valtext_divs #valtext_number').text() : 'This value you provided is not a number. Please try again.';
		    	simpleDialog(msg, null, null, null, returnFocusJS);
				ob.style.fontWeight = 'bold';
				ob.style.backgroundColor='#FFB7BE';
		        return false;
			}
		}

		ob.style.fontWeight = 'normal';
		ob.style.backgroundColor='#FFFFFF';

		//Handle case where min AND max not provided.
		if(min=='' && max==''){ return true; }
		//Handle case where min and/or max provided.
		if(!min==''){holder1 = min-0;} else {holder1=ob.value;}
		if(!max==''){holder2 = max-0;} else {holder2=ob.value;}
		if(ob.value > holder2 || ob.value < holder1){
			ob.style.fontWeight = 'bold';
			ob.style.backgroundColor='#FFB7BE';
			if(returntype=="hard") {
				var msg = ($('#valtext_divs #valtext_rangehard').length) ? $('#valtext_divs #valtext_rangehard').text() : 'The value you provided must be within the suggested range.';
				simpleDialog(msg + ' (' + range_text + ')', null, null, null, returnFocusJS);
			} else {
				var msg1 = ($('#valtext_divs #valtext_rangesoft1').length) ? $('#valtext_divs #valtext_rangesoft1').text() : 'The value you provided is outside the suggested range.';
				var msg2 = ($('#valtext_divs #valtext_rangesoft2').length) ? $('#valtext_divs #valtext_rangesoft2').text() : 'This value is admissible, but you may wish to verify.';
				simpleDialog(msg1 + ' (' + range_text +') ' + msg2, null, null, null, returnFocusJS);
			}
			return false;
		}
		ob.style.fontWeight = 'normal';
		ob.style.backgroundColor='#FFFFFF';
		return true;
	}
}

// Validate a Vanderbilt University Medical Record Number (4-9 digit number)
function is_vanderbilt_mrn(mrn) {
	// Remove non-numerals
	mrn = mrn.replace(/[^0-9]/ig, '');
	if (mrn == '') return true; // Ignore null value
	mrn = mrn*1;
	// Must be 4-9 digits
	return (mrn > 999 && mrn <= 999999999);
}

// Reformat a Vanderbilt University Medical Record Number (4-9 digit number)
function reformat_vanderbilt_mrn(ob) {
	mrn = ob.value;
	// Remove non-numerals
	mrn = mrn.replace(/[^0-9]/ig, '');
	if (mrn != '') {
		mrn = (mrn*1)+'';
		// Add leading zeros, if needed
		while (mrn.length < 9) mrn = "0" + mrn;
	}
	ob.value = mrn;
}

// Return true if value matches a specific Missing Data Code, else false (codes is a comma-delimited string)
function hasmissingcode(val, codes) {
    // If null, return false
    if (typeof val == 'undefined' || typeof codes == 'undefined') return false;
    if (val === null) return false;
    // Make sure it's a string
    val += "";
		codes += "";
    // If blank, then return false
    if (val == "") return false;
		// Return false if value is not a missing data code
		if (!missing_data_codes_check || !in_array(val, missing_data_codes)) return false;
		// Loop through array of codes for a match
		const codesArray = codes.replace(/\s+/g, '').split(',');
		for (let i = 0; i < codesArray.length; i++) {
			if (val == codesArray[i]) return true;
		}
		return false;
}

// Return true if value is a Missing Data Code, else false
function ismissingcode(val) {
    // If null, return false
    if (typeof val == 'undefined') return false;
    if (val === null) return false;
    // Make sure it's a string
    val += "";
    // If blank, then return false
    if (val == "") return false;
    // If a missing code, then return true
    return (missing_data_codes_check && in_array(val, missing_data_codes));
}

// Return true if value is blank/null or is a Missing Data Code, else false
function isblankormissingcode(val) {
    // If null, return true
    if (typeof val == 'undefined') return true;
    if (val === null) return true;
    // Make sure it's a string
    val += "";
    // If blank, then return true
    if (val == "") return true;
    // If a missing code, then return true
    return (missing_data_codes_check && in_array(val, missing_data_codes));
}

// Return true if value is blank/null and not a Missing Data Code, else false
function isblanknotmissingcode(val) {
    return (typeof val == 'undefined' || val === null || val === "");
}

// Text Calculation
function calctext(logic)
{
	logic = filter_tags(logic);
	return (typeof logic != 'string') ? logic : logic.replace(/&lt; /g, '<'); // Replace escaped less-than characters followed by a space, which are added via filter_tags()
}

// Date Calculation
function calcdate(d1, offset, unit, dateformat, datatype_return, dateformat_return)
{
	// Make sure Units are provided
	if (typeof unit == 'undefined') unit = 'date';
	if (unit == null) {
		alert('CALCULATION ERRORS EXIST!\n\nThere is a syntactical error in a CALCDATE calculation on this page. '
			+ 'The UNIT parameter is not specified. Please edit the equation to fix this.\n\n'
			+ 'See the Help & FAQ page for documentation on using the CALCDATE function.');
		return;
	}
	// Missing data codes
	if (missing_data_codes_check) {
		if (d1 != '' && in_array(d1, missing_data_codes)) d1 = '';
	}
	// Initialize parameters first
	if (typeof datatype_return == 'undefined') datatype_return = 'date';
	if (!isNumeric(offset)) return 'NaN';
	var d1 = String(d1).toLowerCase();
	var dateformatProvided = (dateformat != null);
	if (dateformatProvided && dateformat != '') var dateformat = dateformat.toLowerCase();
	if (dateformat != "mdy" && dateformat != "dmy") dateformat = "ymd";
	if (typeof dateformat_return == 'undefined') {
		dateformat_return = dateformat;
	} else if (dateformat_return != "mdy" && dateformat_return != "dmy") {
		dateformat_return = "ymd";
	}
	// Check if using "now" or "today"
	if (d1 == "now") {
		if (dateformat == "mdy") {
			d1 = now_mdy;
		} else if (dateformat == "dmy") {
			d1 = now_dmy;
		} else {
			d1 = now;
		}
	} else if (d1 == "today") {
		if (dateformat == "mdy") {
			d1 = today_mdy;
		} else if (dateformat == "dmy") {
			d1 = today_dmy;
		} else {
			d1 = today;
		}
	}
	// Determine data type of field ("date", "time", "datetime", or "datetime_seconds")
	var numcolons = d1.split(":").length - 1;
	if (numcolons == 1) {
		var datatype = "datetime";
	} else if (numcolons > 1) {
		var datatype = "datetime_seconds";
	} else {
		var datatype = "date";
	}
	if (datatype == "date" && d1.indexOf("-") < 0) {
		return 'NaN';
	}
	// Make sure the date/time values aren't empty
	if (d1 == "" || d1 == null) return 'NaN';
	// When possible, check if dates are both in same format and also in same format as specified by dateformat parameter
	if (dateformat == "mdy" || dateformat == "dmy") {
		// For DMY or MDY, make sure hyphens are in correct places
		var dateformat1Correct = (d1.substr(2,1) == '-' && d1.substr(5,1) == '-');
	} else {
		// For YMD, make sure hyphens are in correct places
		var dateformat1Correct = (d1.substr(4,1) == '-' && d1.substr(7,1) == '-');
	}
	if (!bypassBranchingErrors && !dateformat1Correct) {
		var msg = 'CALCULATION ERRORS EXIST!\n\nThere is a syntactical error in a CALCDATE calculation on this page. ';
		msg += '\n\nPROBLEM: The value ("'+d1+'") is not in the format specified in the equation (i.e. "'+dateformat+'"). ';
		msg += 'You will need to modify this field so that its validation format is now "'+dateformat+'" or else modify the DATEFORMAT parameter in the equation.';
		msg += '\n\nSee the Help & FAQ page for documentation on using the CALCDATE function.';
		alert(msg);
		return;
	}
	// DATE, DATETIME, or DATETIME_SECONDS
	var utcTimeComp = "T00:00:00Z";
	// Separate time if datetime or datetime_seconds
	if (datatype != "date") {
		d1b = d1.split(" ");
		// Split into date and time (in seconds)
		d1 = d1b[0];
		var timearray = d1b[1].split(":");
		utcTimeComp = "T"+timearray[0]+":"+timearray[1]+":"+(timearray[2] == undefined ? "00" : timearray[2])+"Z";
	}
	var dt1 = d1.split("-");
	// Convert the dates to seconds (conversion varies due to dateformat)
	if (dateformat == "ymd") {
		var yyyy = dt1[0];
		var mm = dt1[1];
		var dd = dt1[2];
	} else if (dateformat == "mdy") {
		var yyyy = dt1[2];
		var mm = dt1[0];
		var dd = dt1[1];
	} else if (dateformat == "dmy") {
		var yyyy = dt1[2];
		var mm = dt1[1];
		var dd = dt1[0];
	} else {
		return 'NaN';
	}
	offset = offset*1;
	// Return in specified units
	var time_sec = 0;
	if (unit == "s") {
		time_sec = offset;
	} else if (unit == "m") {
		time_sec = offset*60;
	} else if (unit == "h") {
		time_sec = offset*3600;
	} else if (unit == "d") {
		time_sec = offset*86400;
	} else if (unit == "M") {
		time_sec = offset*2630016;
	} else if (unit == "y") {
		time_sec = offset*31556952;
	} else {
		return 'NaN';
	}
	// Add the offset and get all component values
	let originalDate = new Date(yyyy+"-"+mm+"-"+dd+utcTimeComp); // UTC time
	let new_date = new Date(originalDate.getTime() + round(time_sec * 1000)); // Add time
	// Separate and format all components
	var yyyy = new_date.getUTCFullYear();
	var mm = new_date.getUTCMonth() + 1;
	var dd = new_date.getUTCDate();
	var hh = new_date.getUTCHours();
	var min = new_date.getUTCMinutes();
	var ss = new_date.getUTCSeconds();
	if (mm < 10) mm = "0"+mm;
	if (dd < 10) dd = "0"+dd;
	if (hh < 10) hh = "0"+hh;
	if (min < 10) min = "0"+min;
	if (ss < 10) ss = "0"+ss;
	// Format the date
	var new_date2 = yyyy+"-"+mm+"-"+dd;
	if (dateformat_return == "mdy") {
		new_date2 = date_ymd2mdy(new_date2);
	} else if (dateformat_return == "dmy") {
		new_date2 = date_ymd2dmy(new_date2);
	}
	// Add the time, if applicable
	if (datatype_return == "date") {
		var new_time = "";
	} else if (datatype_return == "datetime_seconds") {
		var new_time = " "+hh+":"+min+":"+ss;
	} else {
		var new_time = " "+hh+":"+min;
	}
	return new_date2+new_time;
}

// Get age of person at a certain date/time (by default return positive integer,
// but if returnDecimal=true, return in years in decimal format)
function age_at_date(dob = "", other_date = "", returnDecimal = false)
{
	// Ensure both values are in YMD format
	dob = convertDateToYMD(dob);
	other_date = convertDateToYMD(other_date);

	// Normalize inputs
	dob = String(dob ?? "").trim();
	other_date = String(other_date ?? "").trim();
	returnDecimal = (returnDecimal === true || returnDecimal === 'true' || returnDecimal === 1 || returnDecimal === '1');

	if (dob === "" || other_date === "") return NaN;

	// Ignore timestamps, if included (strip time part if there's a space)
	if (dob.includes(" ")) dob = dob.split(" ", 2)[0];
	if (other_date.includes(" ")) other_date = other_date.split(" ", 2)[0];

	// Ensure that date is in Y-M-D (or Y/M/D) format and is a real calendar date (leap-year aware)
	// NOTE: Backreferences need double-escaping inside a JS string literal
	const ymd_regex = new RegExp(
		'^(((\\d{2}([13579][26]|[2468][048]|04|08)|(1600|2[048]00))([-\\/])02(\\6)29)|(\\d{4}([-\\/])((0[1-9]|1[012])(\\9)(0[1-9]|1\\d|2[0-8])|((0[13-9]|1[012])(\\9)(29|30))|((0[13578]|1[02])(\\9)31))))$'
	);

	// Ensure both values are in YMD format
	if (!ymd_regex.test(dob) || !ymd_regex.test(other_date)) return NaN;

	let age;

	if (returnDecimal) {
		// Calculate age in decimal format
		age = age_in_years(dob, other_date);

		// If both dates have the same month and day, return an integer to avoid
		// floating-point precision confusion, mirroring the PHP behavior
		age = (dob.slice(4) === other_date.slice(4)) ? (/** @type {number} */ (rounddown(age))) : Number(age);
	} else {
		// Calculate age as integer (same logic as PHP)
		age = (
			(year(other_date) - year(dob))
			+ (
				month(other_date) < month(dob) ? -1
					: month(other_date) === month(dob)
						? (day(other_date) < day(dob) ? -1 : 0)
						: 0
			)
		);

		// Ensure integer (JS Numbers are float64; this matches PHP's (int) cast)
		age = age | 0; // bitwise-or with 0 truncates to 32-bit int, fine for realistic ages
	}

	return age;
}

/**
 * Calculate age in years (with decimals) as of a given date.
 *
 * @param {string|Date} dob          Date of birth (YYYY-MM-DD string or Date)
 * @param {string|Date|null} asOf    As-of date (YYYY-MM-DD string or Date). Defaults to "today" (UTC).
 * @param {object} [opts]
 * @param {number} [opts.precision=6]              Decimal places for rounding.
 * @param {boolean} [opts.feb29AsFeb28=true]       If true, map Feb 29 birthdays to Feb 28 on non-leap years (else keep 2/29 only).
 * @returns {number} Age in years, rounded to `precision`.
 * @throws {TypeError|RangeError} If inputs are invalid or as-of < dob.
 *
 * Notes:
 * - This implementation normalizes all dates to **UTC midnight** to avoid timezone-related off-by-one issues.
 * - If you want IANA timezone handling (e.g., "America/New_York"), see the Temporal-based version in the notes.
 */
function age_in_years(dob, asOf = null, opts = {})
{
	const precision = Number.isInteger(opts.precision) ? opts.precision : 6;
	const feb29AsFeb28 = opts.feb29AsFeb28 !== false; // default true

	// ---- Helpers ----

	// Parse input as a UTC date (00:00:00 UTC) from a Date or YYYY-MM-DD string.
	const toUTCDate = (x) => {
		if (x instanceof Date) {
			// Normalize to UTC midnight based on its UTC year/month/day
			return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
		}
		if (typeof x === 'string') {
			// Expect YYYY-MM-DD or ISO date; keep only the date portion and build UTC.
			const m = String(x).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (!m) throw new TypeError('Invalid date string; expected YYYY-MM-DD or ISO-like date.');
			const [ , y, mo, d ] = m.map(Number);
			return new Date(Date.UTC(y, mo - 1, d));
		}
		throw new TypeError('Date must be a Date object or a YYYY-MM-DD string.');
	};

	const isLeap = (y) => (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);

	// Build UTC date Y-M-D safely (clamps invalid dates like 2/29 on non-leap years if feb29AsFeb28=true).
	const utcYMD = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

	// Anniversary in a given year with Feb 29 rule.
	const anniversaryInYear = (birthUTC, year) => {
		const m = birthUTC.getUTCMonth() + 1;  // 1-12
		const d = birthUTC.getUTCDate();       // 1-31
		if (m === 2 && d === 29 && !isLeap(year)) {
			if (feb29AsFeb28) return utcYMD(year, 2, 28);
			// If not mapping to Feb 28, keep 2/29 only when leap; otherwise choose Mar 1 explicitly if desired.
			// Uncomment next line to force Mar 1 policy instead:
			// return utcYMD(year, 3, 1);
			// By default, keep 2/29 only; for non-leap years, we use 2/28 to ensure a usable anniversary.
			return utcYMD(year, 2, 28);
		}
		return utcYMD(year, m, d);
	};

	// ---- Normalize inputs ----
	const dobUTC = toUTCDate(dob);
	const asOfUTC = asOf ? toUTCDate(asOf) : toUTCDate(new Date());

	if (asOfUTC < dobUTC) {
		throw new RangeError('As-of date must not be earlier than date of birth.');
	}

	// ---- Full years completed ----
	// Use calendar diff logic: compare month/day to determine if this year's birthday has passed.
	const dobY = dobUTC.getUTCFullYear();
	const asY  = asOfUTC.getUTCFullYear();

	const thisYearsBirthday = anniversaryInYear(dobUTC, asY);
	const lastBirthday = thisYearsBirthday <= asOfUTC
		? thisYearsBirthday
		: anniversaryInYear(dobUTC, asY - 1);

	const years = lastBirthday.getUTCFullYear() - dobY;

	// Next birthday = lastBirthday's year + 1
	const nextBirthday = anniversaryInYear(dobUTC, lastBirthday.getUTCFullYear() + 1);

	// ---- Fractional part = progress between last and next birthday ----
	const elapsedMs = asOfUTC.getTime() - lastBirthday.getTime();
	const spanMs    = nextBirthday.getTime() - lastBirthday.getTime();

	if (spanMs <= 0) {
		// Extremely unlikely, but guard anyway
		return Number(years.toFixed(precision));
	}

	const age = years + (elapsedMs / spanMs);
	return Number(age.toFixed(precision));
}

// Date Differencing Functions
function datediff(d1,d2,unit,dateformat,returnSigned)
{
	// Make sure Units are provided
	if (unit == null) {
		alert('CALCULATION ERRORS EXIST!\n\nThere is a syntactical error in a DATEDIFF calculation on this page. '
			+ 'The UNIT parameter is not specified. Please edit the equation to fix this.\n\n'
			+ 'See the Help & FAQ page for documentation on using the DATEDIFF function.');
		return;
	}
	// Missing data codes
    if (missing_data_codes_check) {
        if (d1 != '' && in_array(d1, missing_data_codes)) d1 = '';
        if (d2 != '' && in_array(d2, missing_data_codes)) d2 = '';
    }
	// Initialize parameters first
	var d1 = String(d1).toLowerCase();
	var d2 = String(d2).toLowerCase();
	var dateformatProvided = (dateformat != null && typeof dateformat != 'boolean');
	if (!dateformatProvided && dateformat != null && returnSigned == null) {
		returnSigned = dateformat;
	}
	if (dateformatProvided && dateformat != '') {
		dateformat = dateformat.toLowerCase();
	}
	if (dateformat != "mdy" && dateformat != "dmy") {
		dateformat = "ymd";
	}
	returnSigned = (returnSigned == null) ? false : (returnSigned === true || returnSigned === 'true' || returnSigned === 1 || returnSigned === '1');
	// Check if using "now" or "today"
	if (d1 == "now") d1 = now; else if (d1 == "today") d1 = today;
	if (d2 == "now") d2 = now; else if (d2 == "today") d2 = today;
	var d1isNow = (d1 == now);
	var d2isNow = (d2 == now);	
	var d1isToday = (d1 == today);
	var d2isToday = (d2 == today);
	// Determine data type of field ("date", "time", "datetime", or "datetime_seconds")
	var format_checkfield = (d1isToday || d1isNow) ? d2 : d1;
	var numcolons = format_checkfield.split(":").length - 1;
	if (d1isNow || d2isNow) {
		var datatype = "datetime_seconds";
		if (numcolons == 1) {
			if (d1isNow) {
				if (d2 != '') d2 += ":00";
			} else {
				if (d1 != '') d1 += ":00";
			}
		} else if (numcolons == 0) {
			if (d1isNow) {
				if (d2 != '') d2 += " 00:00:00";
			} else {
				if (d1 != '') d1 += " 00:00:00";
			}
		}
		if (dateformat == "mdy") {
			if (d1isNow) {
				d1 = now_mdy;
				if (d2.length == 8) {
					d2 = today_mdy+" "+d2;
				}
			} else {
				d2 = now_mdy;
				if (d1.length == 8) {
					d1 = today_mdy+" "+d1;
				}
			}
		} else if (dateformat == "dmy") {
			if (d1isNow) {
				d1 = now_dmy;
				if (d2.length == 8) {
					d2 = today_dmy+" "+d2;
				}
			} else {
				d2 = now_dmy;
				if (d1.length == 8) {
					d1 = today_dmy+" "+d1;
				}
			}
		} else if (dateformat == "ymd") {
			if (d1isNow) {
				d1 = now;
				if (d2.length == 8) {
					d2 = today+" "+d2;
				}
			} else {
				d2 = now;
				if (d1.length == 8) {
					d1 = today+" "+d1;
				}
			}
		}
	} else if (numcolons == 1) {
		if (format_checkfield.indexOf("-") > -1) {
			var datatype = "datetime";
		} else {
			var datatype = "time";
		}
	} else if (numcolons > 1) {
		if (format_checkfield.indexOf("-") > -1) {
			var datatype = "datetime_seconds";
		} else {
			var datatype = "time";
		}
	} else {
		var datatype = "date";
	}
	// Make sure both values are same length/datatype
	if (d1.length != d2.length) {
        if (d1.length > d2.length && d2 != '') {
            if (d1.length == 16) {
                if (d2.length == 10) d2 += " 00:00";
                var datatype = "datetime";
				d2isNow = d2isToday = false;
				if (dateformat != "ymd" && d2.substring(0,10) == today) {
					d2 = ((dateformat == "mdy") ? today_mdy : today_dmy) + ' 00:00';
				}
            } else if (d1.length == 19) {
                if (d2.length == 10) d2 += " 00:00:00";
                else if (d2.length == 16) d2 += ":00";
                var datatype = "datetime_seconds";
				d2isNow = d2isToday = false;
				if (dateformat != "ymd" && d2.substring(0,10) == today) {
					d2 = ((dateformat == "mdy") ? today_mdy : today_dmy) + ' 00:00:00';
				}
			}
        } else if (d2.length > d1.length && d1 != '') {
            if (d2.length == 16) {
                if (d1.length == 10) d1 += " 00:00";
                var datatype = "datetime";
				d1isNow = d1isToday = false;
				if (dateformat != "ymd" && d1.substring(0,10) == today) {
					d1 = ((dateformat == "mdy") ? today_mdy : today_dmy) + ' 00:00';
				}
			} else if (d2.length == 19) {
                if (d1.length == 10) d1 += " 00:00:00";
                else if (d1.length == 16) d1 += ":00";
                var datatype = "datetime_seconds";
				d1isNow = d1isToday = false;
				if (dateformat != "ymd" && d1.substring(0,10) == today) {
					d1 = ((dateformat == "mdy") ? today_mdy : today_dmy) + ' 00:00:00';
				}
			}
        }
        var numcolons = max(d1.split(":").length, d2.split(":").length) - 1;
    }
	// TIME
	if (datatype == "time" && !d1isToday && !d2isToday) {
		// Return in specified units
		return secondDiff(timeToSeconds(d1),timeToSeconds(d2),unit,returnSigned);
	}
	if (datatype == "time" && (d1isToday || d2isToday)) {
		return 'NaN';
	}
	// DATE	pre-check
	if ((d1isToday || d2isToday) && numcolons >= 1) {
		datatype = "date";
		if (d1isToday) {
			d2 = d2.substr(0,10);
		} else {
			d1 = d1.substr(0,10);
		}
	}
	if (datatype == "date") {
		// If either is set as today's date
		if (d1isToday) {
			if (dateformat == "mdy") {
				d1 = today_mdy;
			} else if (dateformat == "dmy") {
				d1 = today_dmy;
			} else {
				d1 = today;
			}
		}
		if (d2isToday) {
			if (dateformat == "mdy") {
				d2 = today_mdy;
			} else if (dateformat == "dmy") {
				d2 = today_dmy;
			} else {
				d2 = today;
			}
		}
		if (d1.indexOf("-") < 0 || d2.indexOf("-") < 0) {
			return 'NaN';
		}
	}
	// Make sure the date/time values aren't empty
	if (d1 == "" || d2 == "" || d1 == null || d2 == null) return 'NaN';
	// When possible, check if dates are both in same format and also in same format as specified by dateformat parameter
	if (dateformat == "mdy" || dateformat == "dmy") {
		// For DMY or MDY, make sure hyphens are in correct places
		var dateformat1Correct = (d1.substr(2,1) == '-' && d1.substr(5,1) == '-');
		var dateformat2Correct = (d2.substr(2,1) == '-' && d2.substr(5,1) == '-');
	} else {
		// For YMD, make sure hyphens are in correct places
		var dateformat1Correct = (d1.substr(4,1) == '-' && d1.substr(7,1) == '-');
		var dateformat2Correct = (d2.substr(4,1) == '-' && d2.substr(7,1) == '-');
	}
	if (!bypassBranchingErrors && !(dateformat1Correct && dateformat2Correct)) {
		var msg = 'CALCULATION ERRORS EXIST!\n\nThere is a syntactical error in a DATEDIFF calculation on this page. ';
		if ((dateformat1Correct && !dateformat2Correct) || (!dateformat1Correct && dateformat2Correct)) {
			msg += '\n\nPROBLEM: The two values ("'+d1+'", "'+d2+'") appear to be in different formats from each other. They must both be in the same format. You will need to modify at least one of these fields so that its format is the same as the other (i.e. "ymd", "mdy", or "dmy").';
		}
		if (!dateformat1Correct) {
			msg += '\n\nPROBLEM: The first value ("'+d1+'") is not in the format specified in the equation (i.e. "'+dateformat+'"). ';
			msg += 'You will need to modify this field so that its validation format is now "'+dateformat+'" or else modify the DATEFORMAT parameter in the equation.';
		}
		if (!dateformat2Correct) {
			msg += '\n\nPROBLEM: The second value ("'+d2+'") is not in the format specified in the equation (i.e. "'+dateformat+'"). ';
			msg += 'You will need to modify this field so that its validation format is now "'+dateformat+'" or else modify the DATEFORMAT parameter in the equation.';
		}
		msg += '\n\nSee the Help & FAQ page for documentation on using the DATEDIFF function.';
		alert(msg);
		return;
	}
	// DATE, DATETIME, or DATETIME_SECONDS
	var d1sec = 0;
	var d2sec = 0;
	// Separate time if datetime or datetime_seconds
	if (datatype != "date") {
		d1b = d1.split(" ");
		d2b = d2.split(" ");
		// Split into date and time (in seconds)
		d1 = d1b[0];
		d2 = d2b[0];
		d1sec = timeToSeconds(d1b[1]);
		d2sec = timeToSeconds(d2b[1]);
	}
	var dt1 = d1.split("-");
	var dt2 = d2.split("-");
	// Convert the dates to seconds (conversion varies due to dateformat)
	if (dateformat == "ymd") {
		var dat1 = new Date(Date.UTC(parseInt(dt1[0],10), parseInt(dt1[1],10)-1, parseInt(dt1[2],10), 0, 0, d1sec));
		var dat2 = new Date(Date.UTC(parseInt(dt2[0],10), parseInt(dt2[1],10)-1, parseInt(dt2[2],10), 0, 0, d2sec));
	} else if (dateformat == "mdy") {
		var dat1 = new Date(Date.UTC(parseInt(dt1[2],10), parseInt(dt1[0],10)-1, parseInt(dt1[1],10), 0, 0, d1sec));
		var dat2 = new Date(Date.UTC(parseInt(dt2[2],10), parseInt(dt2[0],10)-1, parseInt(dt2[1],10), 0, 0, d2sec));
	} else if (dateformat == "dmy") {
		var dat1 = new Date(Date.UTC(parseInt(dt1[2],10), parseInt(dt1[1],10)-1, parseInt(dt1[0],10), 0, 0, d1sec));
		var dat2 = new Date(Date.UTC(parseInt(dt2[2],10), parseInt(dt2[1],10)-1, parseInt(dt2[0],10), 0, 0, d2sec));
	} else {
		return 'NaN';
	}
	// Get the difference in seconds
	var sec = (dat2.valueOf()-dat1.valueOf())/1000;
	if (!returnSigned) sec = Math.abs(sec);
	// Return in specified units
	if (unit == "s") {
		return sec;
	} else if (unit == "m") {
		return sec/60;
	} else if (unit == "h") {
		return sec/3600;
	} else if (unit == "d") {
		return (datatype == "date" ? Math.round(sec/86400) : sec/86400);
	} else if (unit == "M") {
		return sec/2630016; // Use 1 month = 30.44 days
	} else if (unit == "y") {
		return sec/31556952; // Use 1 year = 365.2425 days
	}
	return 'NaN';
}
// Return integer 1 (Mon) through 7 (Sun) based on date or datetime provided
function dayoftheweek(dateString, dateVar)
{
	// Check if using "now" or "today"
	if (dateString == "now") dateString = now; else if (dateString == "today") dateString = today;
	// Get date format, if in DMY or MDY format
	const regex = /^[a-z0-9_]+$/;
	if (typeof dateVar != 'undefined' && regex.test(dateVar)) {
		let field = document.querySelector('input[name="' + dateVar + '"]');
		if (field) dateString = convertDateToYMD(field);
	}
	// If input looks like YYYY-MM-DD without time, add local midnight
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		dateString += " 00:00:00";
	}
	const date = new Date(dateString);
	// Invalid date check
	if (isNaN(date.getTime())) {
		return 'NaN';
	}
	let day = date.getDay(); // Sunday=0 ... Saturday=6
	return day === 0 ? 7 : day; // Monday=1 ... Sunday=7
}
// Convert military time to seconds (i.e. number of seconds since midnight)
function timeToSeconds(time) {
	if (typeof time == "undefined") return 'NaN';
	if (time.indexOf(":") < 0) return 'NaN';
	timearray = time.split(":");
	return (timearray[0]*3600) + (timearray[1]*60) + (timearray[2] == undefined ? 0 : timearray[2]*1);
}
// Return the difference of two number values in desired units converted from seconds
function secondDiff(time1,time2,unit,returnSigned) {
	sec = time2-time1;
	if (!returnSigned) sec = Math.abs(sec);
	// Return in specified units
	if (unit == "s") {
		return sec;
	} else if (unit == "m") {
		return sec/60;
	} else if (unit == "h") {
		return sec/3600;
	} else if (unit == "d") {
		return sec/86400;
	} else if (unit == "M") {
		return sec/2630016; // Use 1 month = 30.44 days
	} else if (unit == "y") {
		return sec/31556952; // Use 1 year = 365.2425 days
	}
	return 'NaN';
}
// Calculate exponential of a number "x" (e^x)
function exponential(expnumber) {
	// Argument must be a number
	if (isNaN(expnumber)) return 'NaN';
	return Math.exp(expnumber);
}
// Calculate logarithm of a number with optional base (defaults to "e")
function log(number,base) {
	if (number == null) return 'NaN';
	// If missing numeric base, then do natural log
	if (!isNumeric(base)) return Math.log(number);
	// Return log of number for the given base
	return Math.log(number) / Math.log(base);
}
// Round numbers to a given decimal point
function round(number,decimal_points) {
	if (number == null) return 'NaN';
	if (!decimal_points || decimal_points == null) return Math.round(number);
	var exp = Math.pow(10, decimal_points);
	number = Math.round(number * exp) / exp;
	return parseFloat(number.toFixed(decimal_points));
}
// Round numbers up to a given decimal point
function roundup(number,decimal_points) {
	if (number == null) return 'NaN';
	if (!decimal_points || decimal_points == null) return Math.ceil(number);
	var exp = Math.pow(10, decimal_points);
	number = Math.ceil(number * exp) / exp;
	return parseFloat(number.toFixed(decimal_points));
}
// Round numbers down to a given decimal point
function rounddown(number,decimal_points) {
	if (number == null) return 'NaN';
	if (!decimal_points || decimal_points == null) return Math.floor(number);
	var exp = Math.pow(10, decimal_points);
	number = Math.floor(number * exp) / exp;
	return parseFloat(number.toFixed(decimal_points));
}
// Find mean of list of numbers (can input unlimited amount of arguments)
function mean() {
	var items = mean.arguments.length;
	var count = items;
	var sum = 0;
	var thisnum;
	for (i = 0; i < items; i++) {
		thisnum = mean.arguments[i];
		if (isNumeric(thisnum) && thisnum != 'NaN' && !isNaN(thisnum)) {
			sum += parseFloat(thisnum);
		} else if (thisnum == null || thisnum == "undefined" || thisnum == "" || thisnum == "NaN" || isNaN(thisnum)) {
			count--;
		} else {
			return 'NaN';
		}
	}
	return (sum/count);
}
// Find median of list of numbers (can input unlimited amount of arguments)
function median() {
	var items = median.arguments;
	var n = items.length;
	var count = 0;
	var items2 = new Array();
	var thisnum;
	for (i = 0; i < n; i++) {
		thisnum = items[i];
		if (isNumeric(thisnum) && thisnum != 'NaN' && !isNaN(thisnum)) {
			items2[i] = thisnum;
			count++;
		} else if (thisnum != null && thisnum != "undefined" && thisnum != "" && thisnum != 'NaN' && !isNaN(thisnum)) {
			return 'NaN';
		}
	}
	// Sort the array
	items2.sort(function(a,b){return a - b});
	// Find median
	var h = Math.floor(count/2);
	if (count % 2 == 0) {
		return (items2[h]*1 + items2[h-1]*1) / 2;
	} else {
		return items2[h];
	}
}

// Calculate the modulo
function mod() {
	const items = mod.arguments;
	const n = items.length;
	// mod() requires two arguments (dividend and divisor)
	if (n != 2) return 'NaN';
	let dividend = items[0];
	let divisor = items[1];
	// Both arguments must be integers
	if (!isinteger(dividend) || !isinteger(divisor)) return 'NaN';
	dividend = Number.parseInt(dividend);
	divisor = Number.parseInt(divisor);
	// Divisor must not be 0
	if (divisor == 0) return 'NaN';
	return dividend % divisor;
}

// Pass val as an object of the date field to get its value in YMD, regardless of its defined date format
function convertDateToYMD(val)
{
	if (typeof val == 'object' && val.getAttribute('fv') != null) {
		if (val.getAttribute('fv').indexOf('_mdy') > 0) {
			val = date_mdy2ymd(val.value);
		} else if (val.getAttribute('fv').indexOf('_dmy') > 0) {
			val = date_dmy2ymd(val.value);
		} else {
			val = val.value;
		}
	}
	return val;
}

// Return the year component of a date/datetime field
function yearRC(val) {
	val = (typeof val == 'string' && (['now', 'today']).includes(val.toLowerCase())) ? today : val;
	val = year(val);
	if (val == '') val = 'NaN';
	return val;
}
function year(val)
{
	if (val === null || (typeof val == 'string' && val.indexOf('-') == -1)) return '';
	val = convertDateToYMD(val);
	var parts = val.split('-');
	return (typeof parts[0] != 'undefined' && isinteger(parts[0]*1) && (parts[0]*1) >= 1 && (parts[0]*1) <= 9999 ? parts[0] : '');
}

// Return the month component of a date/datetime field
function monthRC(val) {
	val = (typeof val == 'string' && (['now', 'today']).includes(val.toLowerCase())) ? today : val;
	val = month(val);
	if (val == '') val = 'NaN';
	return val;
}
function month(val)
{
	if (val === null || (typeof val == 'string' && val.indexOf('-') == -1)) return '';
	val = convertDateToYMD(val);
	var parts = val.split('-');
	return (typeof parts[1] != 'undefined' && isinteger(parts[1]*1) && (parts[1]*1) >= 1 && (parts[1]*1) <= 12 ? parts[1] : '');
}

// Return the day component of a date/datetime field
function dayRC(val) {
	val = (typeof val == 'string' && (['now', 'today']).includes(val.toLowerCase())) ? today : val;
	val = day(val);
	if (val == '') val = 'NaN';
	return val;
}
function day(val)
{
	if (val === null || (typeof val == 'string' && val.indexOf('-') == -1)) return '';
	val = convertDateToYMD(val);
	var parts = val.split('-');
	// Remove time, if exists
	if (typeof parts[2] != 'undefined' && val.indexOf(' ') > 0) {
		var parts2 = parts[2].split(' ');
		parts[2] = parts2[0];
	}
	return (typeof parts[2] != 'undefined' && isinteger(parts[2]*1) && (parts[2]*1) >= 1 && (parts[2]*1) <= 31 ? parts[2] : '');
}

// Find max of list of numbers (can input unlimited amount of arguments)
function max() {
	var items = max.arguments;
	var items2 = new Array();
	var thisnum;
	var count = 0;
	for (i = 0; i < items.length; i++) {
		thisnum = items[i];
		if (isNumeric(thisnum) && thisnum != 'NaN' && !isNaN(thisnum)) {
			items2[count] = thisnum;
			count++;
		} else if (thisnum != null && thisnum != "undefined" && thisnum != "" && thisnum != 'NaN' && !isNaN(thisnum)) {
			return 'NaN';
		}
	}
	return Math.max.apply(Math, items2);
}
// Find min of list of numbers (can input unlimited amount of arguments)
function min() {
	var items = min.arguments;
	var items2 = new Array();
	var thisnum;
	var count = 0;
	for (i = 0; i < items.length; i++) {
		thisnum = items[i];
		if (isNumeric(thisnum) && thisnum != 'NaN' && !isNaN(thisnum)) {
			items2[count] = thisnum;
			count++;
		} else if (thisnum != null && thisnum != "undefined" && thisnum != "" && thisnum != 'NaN' && !isNaN(thisnum)) {
			return 'NaN';
		}
	}
	return Math.min.apply(Math, items2);
}
// Find standard deviation of list of numbers (can input unlimited amount of arguments)
function stdev() {
	var data = stdev.arguments;
	var deviation = new Array();
	var valid_data = new Array();
	var sum = 0;
	var devnsum = 0;
	var stddevn = 0;
	var len = data.length;
	var valid_len = 0;
	for (var i=0; i<len; i++) {
		thisnum = data[i];
		if (isNumeric(thisnum) && thisnum != 'NaN' && !isNaN(thisnum)) {
			sum = sum + (thisnum * 1);  // ensure number
			valid_data[valid_len] = thisnum;
			valid_len++;
		} else if (thisnum != null && thisnum != "undefined" && thisnum != "" && thisnum != 'NaN' && !isNaN(thisnum)) {
			return 'NaN';
		}
	}
	data = new Array(); // clear data from memory
	if (valid_len == 0) return 'NaN';
	var mean = (sum/valid_len);
	for (i=0; i<valid_len; i++) {
		deviation[i] = valid_data[i] - mean;
		deviation[i] = deviation[i] * deviation[i];
		devnsum = devnsum + deviation[i];
	}
	return Math.sqrt(devnsum/(valid_len-1));
}
// Return absolute value of a number
function abs(val) {
	return (isNumeric(val) ? Math.abs(val) : 'NaN');
}
// Find sum of list of numbers (can input unlimited amount of arguments)
function sum() {
	var items = sum.arguments.length;
	var thissum = 0;
	var thisnum;
	var usedNums = false;
	for (i = 0; i < items; i++) {
		thisnum = sum.arguments[i];
		if (isNumeric(thisnum) && thisnum+"" != 'NaN' && !isNaN(thisnum)) {
			thissum += parseFloat(thisnum);
			usedNums = true;
		}
	}
	return (usedNums ? thissum : 'NaN');
}

// LEFT substring function
function left(str, charlength) {
	str = str+"";
	if (!isinteger(charlength) || charlength < 1) return "";
	return mid(str, 1, charlength);
}

// RIGHT substring function
function right(str, charlength) {
	str = str+"";
	var strlen = str.length;
	if (!isinteger(charlength) || charlength < 1 || charlength > strlen) return "";
	return mid(str, strlen+1-charlength, charlength);
}

// MID substring function
function mid(str, start, charlength) {
	str = str+"";
	if (!isinteger(start) || start < 1) return "";
	if (!isinteger(charlength) || charlength < 1) return "";
	return str.substr(start-1, charlength);
}

// FIND string function
function find(needle, haystack) {
	needle = needle+"";
	needle = needle.toLowerCase();
	haystack = haystack+"";
	haystack = haystack.toLowerCase();
	return haystack.indexOf(needle)+1;
}

// LENGTH string function
function length(str) {
	str = str+"";
	return str.length;
}

// CONCAT string function
function concat() {
	var all = "";
	var args = concat.arguments;
	var items = args.length;
	for (i = 0; i < items; i++) {
		if (args[i] === 'NaN') args[i] = '';
		all += args[i]+"";
	}
	return all;
}

// CONCAT_WS string function
function concat_ws() {
	const args = concat_ws.arguments;
	if (args.length == 0) {
		return '';
	}
	const separator = args[0];
	const items = Array.from(args).slice(1).filter(x => x !== '' && x !== 'NaN');
	return items.join(separator);
}

// UPPER string function
function upper(str) {
	str = str+"";
	return str.toUpperCase();
}

// LOWER string function
function lower(str) {
	str = str+"";
	return str.toLowerCase();
}

// Random number generator
function random(min, max) {
	if (!Number.isInteger(min) || !Number.isInteger(max)) {
		return 'NaN';
	}
	// Inclusive of min and max (same as mt_rand)
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Serialize a selector (i.e. a web form) into a JSON object with all its components
$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

// Center a jQuery object via .center()
jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +
                                                $(window).scrollTop()) + "px");
    this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
                                                $(window).scrollLeft()) + "px");
    return this;
}

// Returns version of Internet Explorer (if user is using IE)
function vIE(){
	var rv = -1;
	if (navigator.appName == 'Microsoft Internet Explorer')
	{
		var ua = navigator.userAgent;
		var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
		if (re.exec(ua) != null)
		  rv = parseFloat( RegExp.$1 );
	}
	else if (navigator.appName == 'Netscape')
	{
		var ua = navigator.userAgent;
		var re  = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
		if (re.exec(ua) != null)
		  rv = parseFloat( RegExp.$1 );
	}
	// If IE7, 8, 9, or 10, use the Document Mode to really determine version
	if (rv >= 7 && rv <= 10) {
		rv = (document.documentMode) ? document.documentMode : 7;
	}
	return rv;
}

function chk_username(pass,allow_spaces_and_apostrophes) {
	if (typeof allow_spaces_and_apostrophes == 'undefined') allow_spaces_and_apostrophes = false;
	// pass - field to check
	// returns false if there are characters other than letters,
	// 	numbers, and underscores
	//re = /^\w@+$/;
	//Allow alphanumeric, underscore, period, hyphen, ampersand
	if (allow_spaces_and_apostrophes) {
		re = /^([a-zA-Z0-9'_\s\.\-\@])+$/;
	} else {
		re = /^([a-zA-Z0-9_\.\-\@])+$/;
	}
	return re.test(pass.value);
}
function chk_cont(pass, password_complexity) {
	// pass - field to check
	// password_complexity - number password for matching criteria
	/*
		"0": one letter, and one number
		"1": one lower-case letter, one upper-case letter, and one number
		"2": one lower-case letter, one upper-case letter, and either one number or one special character
		"3": one lower-case letter, one upper-case letter, one number, and one special character
	 */
	var numbers = /\d+/;
	var lowercase = /[a-z]+/;
	var uppercase = /[A-Z]+/;
	var letters = /[A-Za-z]+/;
	var specials = /[!@#$%^&*()_+~’\-=\[\]{};':"\\|/,.?]+/;
	var nonspecial = /[<>\\]+/;

	switch (password_complexity) {
		case 0:
			return letters.test(pass.value) && numbers.test(pass.value);
			break;
		case 1:
			return lowercase.test(pass.value) && uppercase.test(pass.value) && numbers.test(pass.value);
			break;
		case 2:
			return lowercase.test(pass.value)
					&& uppercase.test(pass.value)
					&& (numbers.test(pass.value)
						|| (specials.test(pass.value) && !nonspecial.test(pass.value)));
			break;
		case 3:
			return lowercase.test(pass.value)
				&& uppercase.test(pass.value)
				&& numbers.test(pass.value)
				&& (specials.test(pass.value) && !nonspecial.test(pass.value));
			break;
	}
	return false;
}

function chk_len(pass,mn,mx) {
   // pass - field to check
   // mn   - minimum allowed length
   // mx   - maximum allowed length
   // returns false if pass.value.length is less than
   //          or greater than mx
   var str = trim(pass.value);
return str.length >= mn && str.length <= mx }

function trim(s) {
   // str - any string
   // returns the same string with stripped leading and trailing blanks
   var str = new String(s);
   return (str == '') ? '' : str.replace(/^\s*|\s*$/g,"");
}

function alertbad(fld,mess) {
   alert(mess);
   setTimeout(function () { fld.focus() }, 1);
   return false;
}

// Highlight a whole html table (by ID) for a specified amount of time
function highlightTable(tblid,event_time) {
	if (document.getElementById(tblid) == null) return;
	$('#'+tblid+' td').effect('highlight',{},event_time);
}
//Highlight a table row (by ID) for a specified amount of time
function highlightTableRow(rowid,event_time) {
	$('#'+rowid+' td').effect('highlight',{},event_time);
}
//Highlight a table row (by jQuery object) for a specified amount of time
function highlightTableRowOb(ob,event_time) {
	ob.children('td').effect('highlight',{},event_time);
}

//Display "Working" div as progress indicator
function showProgress(show,ms,text) {
	// Set default time for fade-in/fade-out
	if (typeof ms == 'undefined') ms = 500;
	if (typeof text == 'undefined') text = RCView.getLangStringByKey('design_08', 'Working &hellip;');
	if ($("#working").length) $("#working").remove();
	$('body').append('<div id="working"><i class="fa-solid fa-spinner fa-spin-pulse me-3"></i><span>'+text+'</span></div>');
	if (!$("#fade").length) $('body').append('<div id="fade"></div>');
	if (show) {
		$('#fade').addClass('black_overlay').show();
		$('#working').center().fadeIn(ms);
	} else {
		setTimeout(function(){
			$("#fade").removeClass('black_overlay').hide();
			$("#working").fadeOut(ms);
		},ms);
	}
}

// Create/Edit Project form manipulation
function setFieldsCreateForm(slide_effect) {

	// Disble blind toggle sliding effect?
	if (slide_effect == null) slide_effect = true;
	var slow = (slide_effect) ? 'slow' : 0;

	// Check if step 1 is checked
	if ($('#projecttype1').prop('checked') || $('#projecttype2').prop('checked') ) {
		// Forms or Survey+Forms
		$('#repeatforms_chk1').removeAttr('disabled');
		$('#repeatforms_chk2').removeAttr('disabled');
		$('#step2').fadeTo(slow, 1);
	} else {
		$('#repeatforms_chk1').prop('disabled', 'disabled');
		$('#repeatforms_chk1').prop('checked',false);
		$('#repeatforms_chk2').prop('disabled', 'disabled');
		$('#repeatforms_chk2').prop('checked',false);
		if ($('#projecttype0').prop('checked')) {
			// Single Survey is selected
			if (slide_effect) {
				$('#step2').hide('fade',slow);
				$('#additional_options').hide('fade',slow);
			} else {
				$('#step2').hide();
				$('#additional_options').hide();
			}
			// Uncheck all checkboxes in "Additional options"
			$('#additional_options input[type="checkbox"]').prop('checked',false);
		} else {
			$('#step2').fadeTo('fast', 0.2);
			$('#additional_options').fadeTo('fast', 0.2);
		}
	}

	// Check if step 2 is checked
	if ($('#repeatforms_chk2').prop('checked')) {
		$('#step3').fadeTo(slow, 1);
		$('#scheduling_chk').removeAttr('disabled');
	} else {
		$('#scheduling_chk').prop('disabled', 'disabled');
		$('#scheduling_chk').prop('checked', false);
		$('#step3').fadeTo('fast', 0.2);
	}

	// Show additional options if step 2 is selected
	if ($('#repeatforms_chk1').prop('checked') || $('#repeatforms_chk2').prop('checked')) {
		$('#additional_options').fadeTo(slow, 1);
		$('#additional_options input[type="checkbox"]').prop('disabled',false);
	} else {
		$('#additional_options').fadeTo('fast', 0.2);
		$('#additional_options input[type="checkbox"]').prop('checked',false).prop('disabled',true);
	}

	// Surveys enabled
	if ($('#datacollect_chk').prop('checked') && $('#projecttype0').prop('checked')) {
		$('#surveys_enabled').val(2);
	} else if ($('#datacollect_chk').prop('checked') && $('#projecttype2').prop('checked')) {
		$('#surveys_enabled').val(1);
	} else {
		$('#surveys_enabled').val(0);
	}
	// Repeatforms field
	$('#repeatforms').val( ((($('#datacollect_chk').prop('checked') && $('#repeatforms_chk2').prop('checked')) || $('#scheduling_chk').prop('checked')) ? 1 : 0) );
	// Scheduling field
	$('#scheduling').val( (($('#scheduling_chk').prop('checked')) ? 1 : 0) );
	// Randomization field
	$('#randomization').val( (($('#randomization_chk').prop('checked')) ? 1 : 0) );
}

// Check values before submission on Create/Edit Project form
function setFieldsCreateFormChk() {
	if ($('#app_title').val().length < 1) {
		simpleDialog(window.lang.create_project_141, window.lang.create_project_142);
		return false;
	}
	if (page != "ProjectGeneral/copy_project_form.php") {
		if (
			(!$('#projecttype0').prop('checked') && !$('#projecttype1').prop('checked') && !$('#projecttype2').prop('checked'))
			|| ( ( $('#projecttype1').prop('checked') || $('#projecttype2').prop('checked') ) && ( !$('#repeatforms_chk1').prop('checked') && !$('#repeatforms_chk2').prop('checked') ) )
		   ) {
			simpleDialog('Please fill out all the fields and steps.','Some steps not completed');
			return false;
		}
	}
	if ($('#purpose').val() == '' || ($('#purpose').val() == '1' && $('#purpose_other_text').val() == '')) {
		simpleDialog(window.lang.create_project_143, window.lang.create_project_144);
		return false;
	}
	var numChkBoxes = $('#purpose_other_research input[type=checkbox]').length - 1; // Number of Research checkboxes
	if ($('#purpose').val() == '2'){
		var numChecked = 0;
		for (i = 0; i <= numChkBoxes; i++) {
			if (document.getElementById('purpose_other['+i+']').checked) {
				numChecked++;
			}
		}
		if (numChecked < 1)	{
			simpleDialog(window.lang.create_project_145, window.lang.create_project_146);
			return false;
		}
	} else {
		for (i = 0; i <= numChkBoxes; i++) {
			document.getElementById('purpose_other['+i+']').checked = false;
		}
	}
	// If "template" option is selected, make sure the user has chosen a template from the table
	if ($('input[name="project_template_radio"]').length && !isNumeric($('input[name="copyof"]:checked').val())) {
		if ($('input[name="project_template_radio"]:checked').val() == '1') {
			simpleDialog(window.lang.create_project_149, window.lang.create_project_150);
			return false;
		} else if (getParameterByName('type') != 'request_new' && $('input[name="project_template_radio"]:checked').val() == '2'
			&& ($('input[name="odm"]').val() == ''
			|| ($('input[name="odm"]').val() != '' && $('input[name="project_template_radio"]:checked').val() == '2'
				&& getfileextension(trim($('input[name="odm"]').val().toLowerCase())) != 'xml'))) {
			simpleDialog(window.lang.create_project_147, window.lang.create_project_148);
			return false;
		} else if ($('input[name="project_template_radio"]:checked').val() == '3') {
			if (trim($('textarea[name="ddp_datamart_mrns"]').val()) == '') {
				$('textarea[name="ddp_datamart_mrns"]').val(trim($('textarea[name="ddp_datamart_mrns"]').val()));
				simpleDialog('You have not entered any Medical Record Numbers into the text box for Step 1. Please enter one or more MRNs with one MRN per line.','MRNs were not entered');
				return false;
			}
			if ($('#ext_field_tree_fields input[type="checkbox"]:checked').length == 1) {
				simpleDialog('No fields have been selected in Step 3. You must choose at least one field other than the MRN field in the Source Fields List in Step 3.','No fields selected');
				return false;
			}
		}
	}
	return true;
}

// Close to-do list iframe
function closeToDoListFrame() {
    if (inIframe()) window.top.$('.iframe-container').fadeOut(200, function(){ window.top.location.reload();  });
}

// View User list on User Controls page in Control Center
function view_user(username) {
	if (username.length < 1) return;
	$('#view_user_progress').css({'visibility':'visible'});
	$('#user_search_btn').prop('disabled',true);
	$('#user_search').prop('disabled',true);
	$.get(app_path_webroot+'ControlCenter/user_controls_ajax.php', { user_view: 'view_user', view: 'user_controls', username: username },
		function(data) {
			$('#view_user_div').html(data);
			highlightTable('indv_user_info',1000);
			enableUserSearch();
		}
	);
}

// Grow a textarea field on data entry form when "expand" link is clicked
function growTextarea(field) {
	if ($('#'+field).val().length > 0) {
		$('#'+field+'-expand').css({'visibility':'hidden'});
		autosize($('#'+field));
	}
}

// Open pop-up window for viewing videos
function popupvid(video,title) {
	if (title == null) title = "REDCap Video";
	window.open('https://redcap.vumc.org/consortium/videoplayer.php?video='+video+'&title='+title+'&referer='+server_name,'myWin','width=1050, height=800, toolbar=0, menubar=0, location=0, status=0, scrollbars=1, resizable=1');
}

// Retrieve variable's value from URL
function getParameterByName(name,use_parent_window) {
	if (use_parent_window == null) use_parent_window = false;
	var loc = (use_parent_window ? window.opener.location.href : window.location.href);
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( loc );
	if( results == null )
		return "";
	else
		return strip_tags(results[1]);
}

// Get, set, and delete cookies
function getCookie(c_name) {
	if (document.cookie.length>0)
	  {
	  c_start=document.cookie.indexOf(c_name + "=");
	  if (c_start!=-1)
		{
		c_start=c_start + c_name.length+1;
		c_end=document.cookie.indexOf(";",c_start);
		if (c_end==-1) c_end=document.cookie.length;
		return unescape(document.cookie.substring(c_start,c_end));
		}
	  }
	return "";
}
function deleteCookie(name) {
	document.cookie = name + "=" + ";expires=Thu, 01-Jan-1970 00:00:01 GMT; path=/" + appendCookieAttributes();
}
// Set cookie with expiration at day-level
function setCookie(c_name,value,expiredays) {
	var exdate=new Date();
	exdate.setDate(exdate.getDate()+expiredays);
	document.cookie=c_name+ "=" +escape(value)+((expiredays==null) ? "" : ";expires="+exdate.toGMTString())+"; path=/" + appendCookieAttributes();
}
// Set cookie with expiration at minute-level
function setCookieMin(c_name,value,expiremin) {
	var exdate = new Date();
	var exdatemin = Math.floor(expiremin);
	var exdatesec = round((expiremin-exdatemin)*60);
	exdate.setMinutes(exdate.getMinutes()+exdatemin,exdate.getSeconds()+exdatesec,0);
	document.cookie=c_name+ "=" +escape(value)+((expiremin==null) ? "" : ";expires="+exdate.toGMTString())+"; path=/" + appendCookieAttributes();
}
// Append "samesite" and "secure" cookie attributes when applicable
function appendCookieAttributes() {
	return (cookie_samesite==""?"":"; SameSite="+cookie_samesite) + (cookie_secure?"; Secure":"");
}

// Modify the page's URL in browser's address bar *without* reloading the page
function modifyURL(newUrl) {
	if (window.history.pushState && window.history.replaceState) {
		window.history.pushState({}, document.title, newUrl);
	}
}

// After providing a URL and a query string parameter name, return the URL with that parameter removed
function removeParameterFromURL(url, param_name) {
	// Does the url start with 'http'?
	const parsedUrl =  url.toLowerCase().startsWith('http') 
		? new URL(url)
		: new URL(url, window.location.origin);
	parsedUrl.searchParams.delete(param_name);
	return urldecode(parsedUrl.toString());
}

/**
 * update or add a search param to the provided URL
 * @param {String} url 
 * @param {String} param_name 
 * @param {String} value 
 * @returns {String} the updated URL
 */
function updateParameterInURL(url, param_name, value) {
	const parsedUrl = new URL(url);
	parsedUrl.searchParams.set(param_name, value);
	return parsedUrl.toString();
}

// Display e-signature explanation dialog pop-up
function esignExplainLink() {
	$.get(app_path_webroot+'Locking/esignature_explanation_popup.php', { }, function(data) {
		if (!$('#esignExplain').length) $('body').append('<div id="esignExplain"></div>');
		$('#esignExplain').html(data);
		$('#esignExplain').dialog({ bgiframe: true, title: 'What is an E-signature?', modal: true, width: 650, buttons: { Close: function() { $(this).dialog('close'); } } });
	});
}

// Display smart variables explanation dialog pop-up
function smartVariableExplainPopup(searchPrefill, zIndex) {
	if (typeof zIndex == 'undefined') zIndex = null;
	if (typeof searchPrefill == 'undefined') searchPrefill = '';
	const url = new URL(app_path_webroot_full+'redcap_v'+redcap_version+'/Design/smart_variable_explain.php');
	if (typeof super_user != 'undefined' && super_user == 1) url.searchParams.append('su', '1');
	if (isProjectPage) url.searchParams.append('pid', pid);
	$.get(url.toString(), { },function(data){
		var json_data = (typeof(data) == 'object') ? data : JSON.parse(data);
		if (json_data.length < 1) {
			alert(woops);
			return false;
		}
		simpleDialog(json_data.content,json_data.title,'smart_variable_explain_popup',1000);
		fitDialog($('#smart_variable_explain_popup'));
		if (zIndex) {
			$('#smart_variable_explain_popup').parent().css('z-index', zIndex);
		}
		if (searchPrefill != '') {
			$('#smart_variable_explain_popup input.filter-text:first').val(strip_tags(searchPrefill)).trigger('keyup');
		}
	});
	return false;
}

// Get file extension from filename string
function getfileextension(filename) {
	if (!filename || filename == null || filename.length == 0) return "";
	var dot = filename.lastIndexOf(".");
	if (dot == -1) return "";
	var extension = filename.substr(dot+1,filename.length);
	return extension;
}

// Determine if navbar on My Projects page is too tall
function isNavTooTall() {
	return ($('#redcap-home-navbar-collapse').length && $('#redcap-home-navbar-collapse').height() > 50);
}

function showNavMore() {
    var selector = '#redcap-home-navbar-collapse li.nav-item.dropdown';
    if (!$(selector+':visible').length)  $(selector).removeClass('d-lg-none');
}

// Fix the nav bar size if too tall
function fixNavBarHeight() {
    // Reset values
	$('#redcap-home-navbar-collapse ul li').show();
    $('#redcap-home-navbar-collapse li.nav-item.dropdown').addClass('d-lg-none');
    // Don't do this for mobile
	if (isMobileDeviceFunc()) {
        $('#nav-tab-training2, #nav-tab-help2').hide();
	    return;
    }
	// Adjust nav menu
	if (isNavTooTall()) {
		$('#nav-tab-training').hide();
        showNavMore();
		if (isNavTooTall()) {
			$('#nav-tab-help').hide();
			if (isNavTooTall()) {
				$('#nav-tab-home').hide();
			}
		}
	}
    if ($('#nav-tab-training:visible').length) {
        $('#nav-tab-training2').hide();
    } else {
        $('#nav-tab-training2').show();
    }
    if ($('#nav-tab-help:visible').length) {
        $('#nav-tab-help2').hide();
    } else {
        $('#nav-tab-help2').show();
    }
    if ($('#nav-tab-sendit:visible').length) {
        $('#nav-tab-sendit2').hide();
    } else {
        $('#nav-tab-sendit2').show();
    }
    if ($('#nav-tab-profile:visible').length) {
        $('#nav-tab-profile2').hide();
    } else {
        $('#nav-tab-profile2').show();
    }
    if ($('#nav-tab-logout:visible').length) {
        $('#nav-tab-logout2').hide();
    } else {
        $('#nav-tab-logout2').show();
    }
}

// Initialization functions for non-project-level pages
function initPageGlobal() {
	fixNavBarHeight();
	// Perform actions upon page resize
	window.onresize = function() {
		fixNavBarHeight();
		// User Messaging msg window
		try{ calculateMessageWindowPosition(); }catch(e){}
	}
}

// JavaScript equivalent of PHP's strip_tags() function
function strip_tags(input, allowed) {
  //  discuss at: http://phpjs.org/functions/strip_tags/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Luke Godfrey
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //    input by: Pul
  //    input by: Alex
  //    input by: Marc Palau
  //    input by: Brett Zamir (http://brett-zamir.me)
  //    input by: Bobby Drake
  //    input by: Evertjan Garretsen
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // bugfixed by: Onno Marsman
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // bugfixed by: Eric Nagel
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // bugfixed by: Tomasz Wesolowski
  //  revised by: Rafal Kukawski (http://blog.kukawski.pl/)
  //   example 1: strip_tags('<p>Kevin</p> <br /><b>van</b> <i>Zonneveld</i>', '<i><b>');
  //   returns 1: 'Kevin <b>van</b> <i>Zonneveld</i>'
  //   example 2: strip_tags('<p>Kevin <img src="someimage.png" onmouseover="someFunction()">van <i>Zonneveld</i></p>', '<p>');
  //   returns 2: '<p>Kevin van Zonneveld</p>'
  //   example 3: strip_tags("<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>", "<a>");
  //   returns 3: "<a href='http://kevin.vanzonneveld.net'>Kevin van Zonneveld</a>"
  //   example 4: strip_tags('1 < 5 5 > 1');
  //   returns 4: '1 < 5 5 > 1'
  //   example 5: strip_tags('1 <br/> 1');
  //   returns 5: '1  1'
  //   example 6: strip_tags('1 <br/> 1', '<br>');
  //   returns 6: '1 <br/> 1'
  //   example 7: strip_tags('1 <br/> 1', '<br><br/>');
  //   returns 7: '1 <br/> 1'

  allowed = (((allowed || '') + '')
    .toLowerCase()
    .match(/<[a-z][a-z0-9]*>/g) || [])
    .join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
  var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
    commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
  return input.replace(commentsAndPhpTags, '')
    .replace(tags, function ($0, $1) {
      return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}

// Filter potentially harmful html tags
function filter_tags(val)
{
	// If val is not a string, then return as-is.
	if (typeof val != 'string' || val == '') return val;
	var hasLT = (val.indexOf('<') > -1);
	// Do replace of legitimate tags so we can weed out the ones that *look* legitimate to browsers (e.g., "<this is not real>")
	if (hasLT) {
		// Remove any HTML comments
		if (val.indexOf('<!--') > -1) {
			val = preg_replace('/<!--(.|\s)*?-->/', '', val);
			// Escape any unclosed HTML comments
			val = preg_replace('/(<!--)(.|\s)*?(?!-->)/', '< !--', val);
		}
		// Set replacement strings for < and >
		var lt_realtag_replacement = "||--RC_REALTAG_LT--||";
		var gt_realtag_replacement = "||--RC_REALTAG_GT--||";
		var lt_notrealtag_replacement = "||--RC_NOTREALTAG_LT--||";
		// Add space before the tag name of disallowed tags
		val = replaceAllowedTags(val, lt_realtag_replacement, gt_realtag_replacement);
		// Any remaining "<" must not be valid tags, so put spaces directly after them
		val = preg_replace("/(<)([^0-9])(\s?)/g", lt_notrealtag_replacement+"$2$3", val);
	}
	// Remove all but the allowed tags
	val = strip_tags(val, ALLOWED_TAGS);
	// If any allowed tags contain javascript inside them, then remove javascript due to security issue.
	if (hasLT) {
		// Re-add < and >
		val = val.replace(/\|\|--RC_REALTAG_LT--\|\|/g, "<").replace(/\|\|--RC_REALTAG_GT--\|\|/g, ">");
		val = val.replace(/\|\|--RC_NOTREALTAG_LT--\|\|/g, "&lt; ").replace(/<  /g, "&lt; ");
		// Replace any uses of "javascript:" inside any HTML tag attributes
		var regex = "/(<)([^<>]+)(\\s*)(&#13;|&#9;|&#38;|&Tab;|javascript\\s*:|javascript\\s*&colon;)([^<]*>)/gi";
		var regex_replace = "$1$2$3removed;$5";
		var _flag = regex.substr(regex.lastIndexOf(regex[0]) + 1),
			_pattern = regex.substr(1, regex.lastIndexOf(regex[0]) - 1),
			regex_raw = new RegExp(_pattern, _flag);
		do {
			val = preg_replace(regex, regex_replace, val);
		} while (regex_raw.test(val));
		// Replace any JavaScript events that are used as HTML tag attributes
		var regex = "/(<)([^<>]+)(\\s*[^a-z]+)(\\s+[\\/]?src\\s*[^\\/]*\\/)?(on[a-z]+\\s*=)([^>]*>)?/gi";
		var regex_replace = "$1$2$3removed=$6";
		var _flag = regex.substr(regex.lastIndexOf(regex[0]) + 1),
			_pattern = regex.substr(1, regex.lastIndexOf(regex[0]) - 1),
			regex_raw = new RegExp(_pattern, _flag);
		do {
			val = preg_replace(regex, regex_replace, val);
		} while (regex_raw.test(val));
	}
	// Replace any JavaScript events that are NOT used as HTML tag attributes but exist on their own in the string
	// Replace any uses of "javascript:" inside any HTML tag attributes
	var regex = "/(\\s*)(&#13;|&#9;|&#38;|&Tab;|javascript\\s*:|javascript\\s*&colon;)([^<]*)/gi";
	var regex_replace = "$1removed;$3";
	var _flag = regex.substr(regex.lastIndexOf(regex[0])+1),
		_pattern = regex.substr(1,regex.lastIndexOf(regex[0])-1),
		regex_raw = new RegExp(_pattern,_flag);
	do {
		val = preg_replace(regex, regex_replace, val);
	} while (regex_raw.test(val));
	// Replace any JavaScript events that are used as HTML tag attributes (add a 1K-character chunking because strings longer than 1K can bog down the regex processing)
	var regex = "/(\\s*[^a-z]+)(\\s+[\\/]?src\\s*[^\\/]*\\/)?(on[a-z]+\\s*=)([^>]*)/gi";
	var regex_replace = "$1removed=$4";
	var _flag = regex.substr(regex.lastIndexOf(regex[0])+1),
		_pattern = regex.substr(1,regex.lastIndexOf(regex[0])-1),
		regex_raw = new RegExp(_pattern,_flag);
	let vals = split_string_by_length(val, 1000);
	for (let i = 0; i < vals.length; i++) {
		do {
			if (vals[i].trim().length == 0) {
				break;
			}
			vals[i] = preg_replace(regex, regex_replace, vals[i]);
		} while (regex_raw.test(vals[i]));
	}
	val = vals.join(' ');
	// Return text
	return val;
}

function replaceAllowedTags(val, ltReplacement, gtReplacement) {
	// Build regex to replace the "<" part of all allowable HTML tags
	const tagsList = ALLOWED_TAGS.substring(1, ALLOWED_TAGS.length - 1).split("><");
	const regexRealTag = tagsList.join("|");
	const pattern = new RegExp(`<\\/??(${regexRealTag})[^>]*>`, 'gi');

	// Replacement function
	const replacement = (match) => {
		// Extract the tag name from the match
		const tagMatches = match.match(/<\/?(\w+)/);
		const tagName = tagMatches ? tagMatches[1].toLowerCase() : '';

		// Check if the tag name is in the allowed tags list
		if (tagsList.includes(tagName)) {
			return match.replace(/</g, ltReplacement).replace(/>/g, gtReplacement);
		}
		// Return the original match if the tag is not in the allowed list
		return match;
	};

	// Apply the replacement
	return val.replace(pattern, replacement);
}

// Split a string into an array of max 10K characters, split by either spaces or line breaks
function split_string_by_length(input, maxLength = 10000) {
	const chunks = [];
	if (input.length <= maxLength) {
		chunks[0] = input;
		return chunks;
	}
	let start = 0;
	while (start < input.length) {
		let end = start + maxLength;
		// If end exceeds input length, push the rest
		if (end >= input.length) {
			chunks.push(input.slice(start));
			break;
		}
		// Find the last space before the maxLength
		let spaceIndex = input.lastIndexOf(' ', end);
		if (spaceIndex === -1 || spaceIndex <= start) {
			// If no space found, force cut at maxLength
			spaceIndex = end;
		}
		chunks.push(input.slice(start, spaceIndex));
		start = spaceIndex + 1; // Skip the space
	}
	return chunks;
}

// Clean any HTML containing MS Word garbage
var cleanHTML = function(input) {
    // 1. remove line breaks / Mso classes
    var stringStripper = /(\n|\r| class=(")?Mso[a-zA-Z]+(")?)/g;
    var output = input.replace(stringStripper, ' ');
    // 2. strip Word generated HTML comments
    var commentSripper = new RegExp('<!--(.*?)-->', 'g');
    var output = output.replace(commentSripper, '');
    // 3. remove tags leave content if any
    var tagStripper = new RegExp('<(\/)*(title|meta|link|span|\\?xml:|st1:|o:|font)(.*?)>', 'gi');
    output = output.replace(tagStripper, '');
    // 4. Remove everything in between and including tags '<style(.)style(.)>'
    output = filter_tags(output);
    // 5. remove attributes ' style="..."'
    var badAttributes = ['start', 'align'];
    for (var i = 0; i < badAttributes.length; i++) {
        var attributeStripper = new RegExp(' ' + badAttributes[i] + '="(.*?)"', 'gi');
        output = output.replace(attributeStripper, '');
    }
    return output;
};

// JavaScript equivalent of PHP's preg_replace() function
function preg_replace(pattern, pattern_replace, subject, limit){
	// Perform a regular expression search and replace
    //
    // discuss at: http://geekfg.net/
    // +   original by: Francois-Guillaume Ribreau (http://fgribreau)
    // *     example 1: preg_replace("/(\\@([^\\s,\\.]*))/ig",'<a href="http://twitter.com/\\0">\\1</a>','#followfriday @FGRibreau @GeekFG',1);
    // *     returns 1: "#followfriday <a href="http://twitter.com/@FGRibreau">@FGRibreau</a> @GeekFG"
    // *     example 2: preg_replace("/(\\@([^\\s,\\.]*))/ig",'<a href="http://twitter.com/\\0">\\1</a>','#followfriday @FGRibreau @GeekFG');
    // *     returns 2: "#followfriday <a href="http://twitter.com/@FGRibreau">@FGRibreau</a> @GeekFG"
    // *     example 3: preg_replace("/(\\#[^\\s,\\.]*)/ig",'<strong>$0</strong>','#followfriday @FGRibreau @GeekFG');
    // *     returns 3: "<strong>#followfriday</strong> @FGRibreau @GeekFG"

	if(limit === undefined){
		limit = -1;
	}

	var _flag = pattern.substr(pattern.lastIndexOf(pattern[0])+1),
		_pattern = pattern.substr(1,pattern.lastIndexOf(pattern[0])-1),
		reg = new RegExp(_pattern,_flag),
		rs = null,
		res = [],
		x = 0,
		y = 0,
		ret = subject;

	if(limit === -1){
		var tmp = [];

		do{
			tmp = reg.exec(subject);
			if(tmp !== null){
				res.push(tmp);
			}
		}while(tmp !== null && _flag.indexOf('g') !== -1)
	}
	else{
		res.push(reg.exec(subject));
	}

	for(x = res.length-1; x > -1; x--){//explore match
		tmp = pattern_replace;

		for(y = res[x].length - 1; y > -1; y--){
			tmp = tmp.replace('${'+y+'}',res[x][y])
					.replace('$'+y,res[x][y])
					.replace('\\'+y,res[x][y]);
		}
		ret = ret.replace(res[x][0],tmp);
	}
	return ret;
}

// Enforce character limit on a text box
function charLimit(id,limit) {
	var str = $("#"+id).val();
	if (str.length > limit) {
		$("#"+id).val(str.substring(0,limit));
		alert("You have exceeded the character limit of "+limit+" for this text box. The text entered will now be truncated to "+limit+" characters.");
		setTimeout(function () { $("#"+id).focus() }, 1);
	}
}

function animateConfirmationMsg(item){
  setTimeout(function(){
    item.velocity({height:'39px'},{duration: 700, complete: function(){
        item.velocity({height:0},{duration: 700, delay:2500});
    }
  });
  },500);
}
// Delete an entire project and its data
function delete_project(this_pid,ob,user,status,delete_now) {
  if(AUTOMATE_ALL == 0 && user === 0 && status !== 0){
	if (confirm("REQUEST PROJECT BE DELETED?\nAre you really sure that you want a REDCap administrator to delete this project for you?")) {
		showProgress(1);
		$.get(app_path_webroot+'ProjectGeneral/notifications.php', { pid: pid, type: 'delete_project' },
		  function(data) {
			showProgress(0);
			if (data != '') {
				simpleDialog(data,langDeletedSuccess,null,null,function(){
					window.location.href = app_path_webroot_full+'index.php?action=myprojects';
				});
			} else {
				var $container = $('<div>',{
				  'class': 'del-req-msg-container',
				}),
				$msgWrapper = $('<div>',{
				  'class': 'del-req-msg',
				}),
				$img = $('<img>',{
				  'class': 'del-req-img',
				  src: app_path_images+'tick.png',
				}),
				$text = $('<p>',{
				  'class': 'del-req-text',
				  text: 'Success! A request to DELETE this project has been sent to a REDCap administrator'
				});
				$msgWrapper.append($img).append($text);
				$container.append($msgWrapper);
				$('.delete-target').append($container);
				animateConfirmationMsg($container);
				$('#row_delete_project button').button('disable');
			}
		  }
		);
	}
  }else{
	delete_now = (delete_now == null || delete_now != 1) ? '0' : '1';
	$.post(app_path_webroot+'ProjectGeneral/delete_project.php?pid='+this_pid, { action: 'prompt', delete_now: delete_now }, function(data) {
		initDialog("del_db_dialog",data);
      $('#del_db_dialog').dialog({ bgiframe: true, title: window.lang.edit_project_229, modal: true, width: 550,
		  buttons:
			  [{ text: window.lang.global_53, click: function() {
				  $(this).dialog('close');
			  }},
			  { text: window.lang.control_center_105, click: function() {
				  if (trim($('#delete_project_confirm').val().toLowerCase()) != "delete") {
					  simpleDialog(window.lang.data_entry_653);
					  return;
				  }
				  simpleDialog('<span style="font-size:14px;color:#800000;">'+window.lang.edit_project_231+'</span>',window.lang.edit_project_232,null,null,"$('#del_db_dialog').dialog('close');",window.lang.global_53,'delete_project_do('+this_pid+','+delete_now+')',window.lang.edit_project_232);
			  }
		  }]
	  });
	})
  }
}
function delete_project_do(this_pid,delete_now,super_user_request) {
    super_user_request = (super_user_request == null || super_user_request != 1) ? '0' : '1';
	$(':button:contains("Cancel")').html('Please wait...');
	$(':button:contains("Delete the project")').css('display','none');
	showProgress(1);
	$.post(app_path_webroot+'ProjectGeneral/delete_project.php?pid='+this_pid, { action: 'delete', delete_now: delete_now, super_user_request: super_user_request }, function(data) {
		showProgress(0);
		if (data == '1') {
			if (delete_now) {
				var msg = window.lang.edit_project_230+"<br><br>";
			} else {
				var msg = window.lang.edit_project_234+"<br><br>";
			}
      if(self!=top){//decect if in iframe
          simpleDialog(msg+"You can now close this window.",window.lang.edit_project_235,"",500,"delete_iframe");
      }else {
			if (window.location.href.indexOf("/ControlCenter/") > -1) {
				simpleDialog(msg+window.lang.edit_project_237,window.lang.edit_project_235,"",500,"window.location.reload();");
			} else {
				simpleDialog(msg+window.lang.edit_project_236,window.lang.edit_project_235,"",500,"window.location.href = '"+app_path_webroot_full+"index.php?action=myprojects';");
			}
      }
		} else {
			simpleDialog(woops);
		}
		$('#del_db_dialog').dialog('close');
	});
}

// Undelete a project that was previously "deleted" by a user
function undelete_project(this_pid) {
    if (!super_user) return;
	$.post(app_path_webroot+'ProjectGeneral/delete_project.php?pid='+this_pid, { action: 'prompt_undelete' }, function(data) {
		$('#undelete_project_dialog').html(data).dialog({ bgiframe: true, modal: true, width: 550, buttons: {
			Cancel: function() { $(this).dialog('close'); } ,
			'Undelete the project': function() {
				$.post(app_path_webroot+'ProjectGeneral/delete_project.php?pid='+this_pid, { action: 'undelete' }, function(data) {
					$('#undelete_project_dialog').dialog('close');
					if (data == '1') {
						simpleDialog('The project has now been restored. The page will now reload to reflect the changes.','PROJECT RESTORED!',null,null,"window.location.reload()");
					} else {
						alert(woops);
					}
				});
			}
		} });
	});
}

// Creates hidden div needed for jQuery UI dialog box. If div exists and is a dialog already, removes as existing dialog.
function initDialog(div_id,inner_html) {
	if ($('#'+div_id).length) {
		if ($('#'+div_id).hasClass('ui-dialog-content')) $('#'+div_id).dialog('destroy');
		$('#'+div_id).addClass('simpleDialog');
	} else {
		$('body').append('<div id="'+div_id+'" class="simpleDialog"></div>');
	}
	$('#'+div_id).html((inner_html == null ? '' : inner_html));
}

// Get current time as hh:mm or just hh, mm, or ss
function currentTime(type,showSeconds,returnUTC) {
    if (typeof returnUTC == 'undefined') returnUTC = false;
    var d = new Date();
    if (returnUTC) {
        d.toUTCString();
        d = new Date( d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() );
    }
	var curr_hour = d.getHours();
	if (curr_hour < 10) curr_hour = '0'+curr_hour;
	var curr_min = d.getMinutes();
	if (curr_min < 10) curr_min = '0'+curr_min;
	var curr_sec = d.getSeconds();
	if (curr_sec < 10) curr_sec = '0'+curr_sec;
	if (type=='m') return curr_min;
	else if (type=='h') return curr_hour;
	else if (type=='s') return curr_sec;
	else return curr_hour+':'+curr_min+(showSeconds ? ':'+curr_sec : '');
}

function a11yDatepicker() {
	const $dpDiv = $('#ui-datepicker-div');
	if (!$dpDiv[0]) return;
	if ($.datepicker && !$dpDiv.data('a11y-focus-patched')) {
		$dpDiv.data('a11y-focus-patched', true); // Prevents running these very same Datepicker updates several times over

		const originalUpdate = $.datepicker._updateDatepicker;

		$.datepicker._updateDatepicker = function (inst) {
			// Initial rendering (Note: this call runs not just on first datepicker rendering but also whenever datepicker is updated/redrawn)
			originalUpdate.call(this, inst);

			// After rendering move focus into the calendar
			setTimeout(function () {
				if (!inst || !inst.dpDiv) return;
				const $dp = inst.dpDiv;
				if (!$dp.is(':visible')) return;

				// Remember attached input to restore focus on close
				if (inst.input && inst.input[0]) {
					$dp.data('a11y-return-focus-el', inst.input[0]);
				}

				// Identify as a dialog-like popup
				$dp.attr({
					role: 'dialog',
					'aria-modal': 'false',
					'aria-label': lang.survey_1625
				});

				// Make date links speak full dates (not just “30” for example)
				const year = inst.drawYear;
				const monthIndex = inst.drawMonth; // 0-11
				const monthNames = $.datepicker._defaults.monthNames;
				const monthName = monthNames[monthIndex] || '';

				$dp.find('a.ui-state-default').each(function () {
					const $a = $(this);
					const day = parseInt($a.text(), 10);
					// Full spoken label
					$a.attr('aria-label', `${monthName} ${day}, ${year}`);
				});

				// Prefer selected date, else today, else first available date
				let $focusTarget = $dp.find('.ui-datepicker-current-day a').first();
				if (!$focusTarget.length) $focusTarget = $dp.find('.ui-datepicker-today a').first();
				if (!$focusTarget.length) $focusTarget = $dp.find('a.ui-state-default').first();

				if ($focusTarget.length) {
					function tryFocusAnchor($a) {
						if (!$a.length) return;
						const a = $a[0];
						a.setAttribute('tabindex', '0');
						a.focus();
					}
					setTimeout(() => tryFocusAnchor($focusTarget), 50); // Slight delay to avoid overriding by other internal jQuery UI operations
				}
			}, 0);
		};

		function disableShowOnFocusIfPresent(el, restoreDelayMs = 80) {
			if (!el) return;
			const $el = $(el);
			let originalShowOn = null;
			try {
				originalShowOn = $el.datepicker('option', 'showOn');
			} catch (e) {}
			if (!originalShowOn) return;
			// Temporarily disable "focus" opening by switching to button-only
			$el.datepicker('option', 'showOn', 'button');
			// Re-enable original behavior after a delay (focus should be restored within this delay in order to avoid triggering `onfocus` behavior)
			setTimeout(() => {
				$el.datepicker('option', 'showOn', originalShowOn);
			}, restoreDelayMs);
		}

		function restoreFocusIfClosed() {
			if ($dpDiv.length && !$dpDiv.is(':visible')) {
				const el = $dpDiv.data('a11y-return-focus-el');
				if (el) {
					const originalOnFocus = el.onfocus;
					el.onfocus = null;
					disableShowOnFocusIfPresent(el);
					setTimeout(() => {
						el.blur(); // Blur before focus to "loudly" signal the triggered focus to the screen reader
						setTimeout(() => {
							$(el).trigger('focus');
							el.onfocus = originalOnFocus;
						}, 25);
					}, 50); // Should be less than `restoreDelayMs`
				}
			}
		}
		// Watch for when datepicker is closed (via style or class update - e.g. style="display:none;")
		const dpEl = $dpDiv[0];
		let wasVisible = $dpDiv.is(':visible');
		const obs = new MutationObserver(() => {
			const isVisible = $dpDiv.is(':visible');
			// Only react when visibility actually changes
			if (isVisible !== wasVisible) {
				wasVisible = isVisible;
				if (!isVisible) {
					restoreFocusIfClosed();
				}
			}
		});
		obs.observe(dpEl, {
			attributes: true,
			attributeFilter: ['style', 'class']
		});
	}
	$(document).on('keydown', '#ui-datepicker-div', function (e) {
		if (e.key === 'Escape') {
			e.preventDefault();

			const $dp = $('#ui-datepicker-div');

			// Hide datepicker
			$.datepicker._hideDatepicker();

			// Restore focus to originating input
			const returnEl = $dp.data('a11y-return-focus-el');
			if (returnEl) {
				setTimeout(() => $(returnEl).trigger('focus'), 10);
			}
		}
	});
	$('input.hasDatepicker').each(function () {
		const $input = $(this);
		const $trigger = $input.parent().find('.ui-datepicker-trigger');
		if (!$trigger.length) return;
		// To improve accessibility for keyboard users, let's make jQuery <img> trigger act like a button
		if ($trigger.is('img')) {
			$trigger.attr({
				role: 'button',
				tabindex: '0',
			})
			.off('keydown.a11yDateTrigger')
			.on('keydown.a11yDateTrigger', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					this.click();
				}
			});
		}
	});
}

// Initialize all jQuery date/time-picker widgets
var pickerOpenerField = '';
function initDatePickers() {
	// Pop-up date-picker initialization
	if ($('.cal').length) $('.cal').datepicker({
		buttonText: window.lang.calendar_widget_choosedatehint,
		closeText: window.lang.calendar_widget_done,
		onSelect: function() {
			$(this).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			} 
			catch (e) { }
		},
		dateFormat: 'yy-mm-dd',
		yearRange: '-100:+10',
		changeYear: true,
		changeMonth: true,
		showOn: 'button',
		buttonImage: app_path_images+'date.png',
		buttonImageOnly: true
	});
	// Pop-up date-picker initialization
	$('.date_ymd').datepicker({
		buttonText: window.lang.calendar_widget_choosedatehint,
		closeText: window.lang.calendar_widget_done,
		onClose: function() { 
			setTimeout("$('input[name="+$(this).prop('name')+"]').focus();", 10); 
		},
		onSelect: function() { 
			$(this).focus(); 
			setDataEntryFormValuesChanged($(this).attr('name')); 
			try { 
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch(e) { } 
		},
		dateFormat: 'yy-mm-dd', 
		yearRange: '-100:+10', 
		changeMonth: true, 
		changeYear: true, 
		showOn: 'button', 
		buttonImage: app_path_images+'date.png',
		buttonImageOnly: true, 
		constrainInput: false,
	});
	$('.date_mdy').datepicker({
		buttonText: window.lang.calendar_widget_choosedatehint,
		closeText: window.lang.calendar_widget_done,
		onClose: function() {
			setTimeout("$('input[name="+$(this).prop('name')+"]').focus();", 10);
		},
		onSelect: function() {
			$(this).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		dateFormat: 'mm-dd-yy',
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		showOn: 'button',
		buttonImage: app_path_images+'date.png',
		buttonImageOnly: true,
		constrainInput: false
	});
	$('.date_dmy').datepicker({
		buttonText: window.lang.calendar_widget_choosedatehint,
		closeText: window.lang.calendar_widget_done,
		onClose: function() {
			setTimeout("$('input[name="+$(this).prop('name')+"]').focus();", 10);
		},
		onSelect: function() {
			$(this).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		dateFormat: 'dd-mm-yy',
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		showOn: 'button',
		buttonImage: app_path_images+'date.png',
		buttonImageOnly: true,
		constrainInput: false
	});
	// Pop-up time-picker initialization
	$('.time2').timepicker({
		currentText: RCView.getLangStringByKey('form_renderer_29', 'Now'),
		timeText: RCView.getLangStringByKey('global_13', 'Time'),
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		timeOnlyTitle: window.lang.calendar_widget_choosetime,
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		timeFormat: 'HH:mm',
		hour: currentTime('h'),
		minute: currentTime('m'),
		showOn: 'button',
		buttonImage: app_path_images+'timer.png',
		buttonImageOnly: true
	});
	$('.time3').timepicker({
		currentText: window.lang.form_renderer_29,
		timeText: window.lang.global_13,
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		secondText: window.lang.calendar_widget_sec,
		timeOnlyTitle: window.lang.calendar_widget_choosetime,
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		timeFormat: 'HH:mm:ss',
		hour: currentTime('h'),
		minute: currentTime('m'),
		second: currentTime('s'),
		showOn: 'button',
		buttonImage: app_path_images+'timer.png',
		buttonImageOnly: true
	});
	// Pop-up datetime-picker initialization
	$('.datetime_ymd').datetimepicker({
		currentText: window.lang.form_renderer_29,
		timeText: window.lang.global_13,
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosedatetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		dateFormat: 'yy-mm-dd',
		timeFormat: 'HH:mm',
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		hour: currentTime('h'),
		minute: currentTime('m'),
		showOn: 'button',
		buttonImage: app_path_images+'datetime.png',
		buttonImageOnly: true,
		constrainInput: false
	});
	$('.datetime_mdy').datetimepicker({
		currentText: window.lang.form_renderer_29,
		timeText: window.lang.global_13,
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosedatetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		dateFormat: 'mm-dd-yy',
		timeFormat: 'HH:mm',
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		hour: currentTime('h'),
		minute: currentTime('m'),
		showOn: 'button',
		buttonImage: app_path_images+'datetime.png',
		buttonImageOnly: true,
		constrainInput: false
	});
	$('.datetime_dmy').datetimepicker({
		currentText: window.lang.form_renderer_29,
		timeText: window.lang.global_13,
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosedatetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		dateFormat: 'dd-mm-yy',
		timeFormat: 'HH:mm',
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		hour: currentTime('h'),
		minute: currentTime('m'),
		showOn: 'button',
		buttonImage: app_path_images+'datetime.png',
		buttonImageOnly: true,
		constrainInput: false
	});
	// Pop-up datetime-picker initialization (w/ seconds)
	$('.datetime_seconds_ymd').datetimepicker({
		currentText: window.lang.form_renderer_29,
		timeText: window.lang.global_13,
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		secondText: window.lang.calendar_widget_sec,
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosedatetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch (e) { }
		},
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		dateFormat: 'yy-mm-dd',
		timeFormat: 'HH:mm:ss',
		hour: currentTime('h'),
		minute: currentTime('m'),
		showOn: 'button',
		buttonImage: app_path_images+'datetime.png',
		buttonImageOnly: true,
		constrainInput: false
	});
	$('.datetime_seconds_mdy').datetimepicker({
		currentText: window.lang.form_renderer_29,
		timeText: window.lang.global_13,
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		secondText:window.lang.calendar_widget_sec, 
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosedatetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch(e) { }
		},
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		dateFormat: 'mm-dd-yy',
		timeFormat: 'HH:mm:ss',
		hour: currentTime('h'),
		minute: currentTime('m'),
		showOn: 'button',
		buttonImage: app_path_images+'datetime.png',
		buttonImageOnly: true,
		constrainInput: false
	});
	$('.datetime_seconds_dmy').datetimepicker({
		currentText: window.lang.form_renderer_29,
		timeText: window.lang.global_13,
		hourText: window.lang.calendar_widget_hour,
		minuteText: window.lang.calendar_widget_min,
		secondText: window.lang.calendar_widget_sec,
		closeText: window.lang.calendar_widget_done,
		buttonText: window.lang.calendar_widget_choosedatetimehint,
		onClose: function(dateText, inst) {
			$('#'+$(inst).attr('id')).focus();
			setDataEntryFormValuesChanged($(this).attr('name'));
			try {
				calculate($(this).attr('name'));
				doBranching($(this).attr('name'));
			}
			catch(e) { }
		},
		yearRange: '-100:+10',
		changeMonth: true,
		changeYear: true,
		dateFormat: 'dd-mm-yy',
		timeFormat: 'HH:mm:ss',
		hour: currentTime('h'),
		minute: currentTime('m'),
		showOn: 'button', 
		buttonImage: app_path_images+'datetime.png', 
		buttonImageOnly: true,
		constrainInput: false
	});
	// If user clicks on divs inside the datepicker, make sure the cursor stays in the field if has hardtyped validation via @FORCE-MINMAX
	$('.hasDatepicker, .date_ymd, .date_mdy, .date_dmy, .datetime_ymd, .datetime_mdy, .datetime_dmy, .datetime_seconds_ymd, .datetime_seconds_mdy, .datetime_seconds_dmy').focus(function(){
		pickerOpenerField = $(this).prop('name');
	});
	$('#ui-datepicker-div').on('click mousedown focus',function(e){
		// Don't set focus in the field if we're clicking the datepicker drop-downs for month/year
		if (pickerOpenerField != '' && !$(e.target).hasClass('ui-datepicker-month') && !$(e.target).hasClass('ui-datepicker-year')) {
			$('input[name='+pickerOpenerField+'][hardtyped]').focus();
		}
	});
	// Workaround for strange iOS Safari behavior with timepickers that causes loss of focus when typing (excludes date fields)
	if (isIOS) {
		$('.time2, .time3, .datetime_ymd, .datetime_mdy, .datetime_dmy, .datetime_seconds_ymd, .datetime_seconds_mdy, .datetime_seconds_dmy').keyup(function(e){
			var ob = $(this);
			var val = ob.val();
			setTimeout(function(){
				ob.val('').val(val); // Changing the value to blank then back to original value keeps focus
			}, 10); // Must be delayed by a certain amount to work
		});
	}
	// Accessibility considerations for the datepicker
	// a11yDatepicker();
}

// Initialize all jQuery UI buttons
function initButtonWidgets() {
	if ($('.jqbutton').length) 	  $('.jqbutton'   ).button();
	if ($('.jqbuttonsm').length)  $('.jqbuttonsm' ).button();
	if ($('.jqbuttonmed').length) $('.jqbuttonmed').button();
}

// Initialize all jQuery widgets, buttons, and icons
function initWidgets() {
	// Enable any jQuery UI buttons
	initButtonWidgets();
	// Enable date/time pickers
	initDatePickers();
	// Enable sliders
	try { initSliders(); }catch(e){ }
    // Prevent any auto-filling of text fields by browser methods
    addAutoCompleteToInputs();
}

// Determine if we're in a survey
function is_survey() {
	return (typeof page != 'undefined' && page == 'surveys/index.php');
}

// Fit a jQuery UI dialog box on the page if too tall.
function fitDialog(ob) {
    try {
        var winh = $(window).height();
        
        var hasNavBar = (!is_survey() && $('.navbar.navbar-light.fixed-top').css('display') != 'none');
        if (hasNavBar) winh -= $('.navbar.navbar-light.fixed-top').height() + 30;
        var thisHeight = $(ob).height();
        var dialogCollapsedOnMobile = (isMobileDevice && thisHeight < 20);
        if ($(ob).hasClass('ui-dialog-content') && ((thisHeight + 130) >= winh || dialogCollapsedOnMobile)) {
            // Set new height to be slightly smaller than window size
            $(ob).dialog('option', 'height', winh - (isMobileDevice ? 130 : 30));
            // If height somehow ends up as 0 (tends to happen on mobile devices)
            if (dialogCollapsedOnMobile) $(ob).height(winh - 85);
            // Center it
            $(ob).dialog('option', 'position', ["center", 10]);
        } else {
			// If dialog has scrollbar, increase height to fit window better
			if ((thisHeight + 130) < winh && hasScrollbar($(ob))) {
				$(ob).dialog('option', 'height', winh - (isMobileDevice ? 130 : 30));
			}
			// If height somehow ends up as 0 (tends to happen on mobile devices)
			if (dialogCollapsedOnMobile) $(ob).height(winh - 85);
            // Center it
            $(ob).dialog('option', 'position', {my: 'center', at: 'center', of: window});
        }
    } catch(e){ }
}

function hasScrollbar($element) {
	if ($element.length === 0 || !$element.is(':visible')) {
		return false;
	}
	var hasVerticalScrollbar = round($element.get(0).scrollHeight) > round($element.outerHeight());
	return hasVerticalScrollbar;
}

// Print only a specific div's contents on a page
function printDiv(div_id) 
{
  var divToPrint=document.getElementById(div_id);
  var newWin=window.open('','Print-Window');
  newWin.document.open();
  newWin.document.write('<html><body onload="window.print()">'+divToPrint.innerHTML+'</body></html>');
  newWin.document.close();
  setTimeout(function(){newWin.close();},10);
}

// Print an area of the webpage to a PDF via a PNG image
var loadedJSPDF = false;
function exportPageAsPDF(selector, filename, selectorHideElements)
{
	if (isIE) {
		simpleDialog("Sorry, but this feature is not supported by Internet Explorer. Please try it again using another web browser.");
		return;
	}
	// Load the JSPDF file
	if (!loadedJSPDF) {
		loadJS(app_path_webroot+"Resources/js/Libraries/html2canvas.min.js");
		loadJS(app_path_webroot+"Resources/js/Libraries/jspdf.umd.min.js");
		loadJS(app_path_webroot+"Resources/js/ExportPageAsPDF.js");
		loadedJSPDF = true;
	}
	exportPageAsPDF2(selector, filename, selectorHideElements);
}

// Checks if value is in array (similar to PHP version of it)
function in_array(needle, haystack, argStrict) {
    // *     example 1: in_array('van', ['Kevin', 'van', 'Zonneveld']);
    // *     returns 1: true
    // *     example 2: in_array('vlado', {0: 'Kevin', vlado: 'van', 1: 'Zonneveld'});
    // *     returns 2: false
    // *     example 3: in_array(1, ['1', '2', '3']);
    // *     returns 3: true
    // *     example 3: in_array(1, ['1', '2', '3'], false);
    // *     returns 3: true
    // *     example 4: in_array(1, ['1', '2', '3'], true);
    // *     returns 4: false
    var key = '', strict = !!argStrict;
    if (strict) {
        for (key in haystack) {
            if (haystack[key] === needle) {
                return true;
            }
        }
    } else {
        for (key in haystack) {
            if (haystack[key] == needle) {
                return true;
            }
        }
    }
    return false;
}

// Find index of a given array value (similar to PHP version of it)
function array_search(needle, haystack, argStrict) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // *     example 1: array_search('zonneveld', {firstname: 'kevin', middle: 'van', surname: 'zonneveld'});
  // *     returns 1: 'surname'
  // *     example 2: ini_set('phpjs.return_phpjs_arrays', 'on');
  // *     example 2: var ordered_arr = array({3:'value'}, {2:'value'}, {'a':'value'}, {'b':'value'});
  // *     example 2: var key = array_search(/val/g, ordered_arr); // or var key = ordered_arr.search(/val/g);
  // *     returns 2: '3'

  var strict = !!argStrict,
    key = '';

  if (haystack && typeof haystack === 'object' && haystack.change_key_case) { // Duck-type check for our own array()-created PHPJS_Array
    return haystack.search(needle, argStrict);
  }
  if (typeof needle === 'object' && needle.exec) { // Duck-type for RegExp
    if (!strict) { // Let's consider case sensitive searches as strict
      var flags = 'i' + (needle.global ? 'g' : '') +
            (needle.multiline ? 'm' : '') +
            (needle.sticky ? 'y' : ''); // sticky is FF only
      needle = new RegExp(needle.source, flags);
    }
    for (key in haystack) {
      if (needle.test(haystack[key])) {
        return key;
      }
    }
    return false;
  }

  for (key in haystack) {
    if ((strict && haystack[key] === needle) || (!strict && haystack[key] == needle)) {
      return key;
    }
  }

  return false;
}

// Append the CSRF token from user's session to all forms on the webpage
function appendCsrfTokenToForm() {
	if (window.redcap_csrf_token) {
		setTimeout(function(){
			$('form').each(function(){
				$(this).append('<input type="hidden" name="redcap_csrf_token" value="'+redcap_csrf_token+'">')
			});

			REDCap.appendCsrfTokenToFormComplete = true
		},100);
	}
}

// Unescape a string that is URL encoded ("escape" in javascript)
function urldecode(str) {
	return decodeURIComponent((str + '').replace(/\+/g, '%20'));
}

// Escape a string so that it is URL encoded
function urlencode(str) {
	return encodeURIComponent(str + '');
}

// Determine if URL is a proper URL
function isUrl(s) {
	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/i;
	return regexp.test(s);
}

// Test if a URL is reachable
function testUrl(url,request_method,evalJsOnFail,useConfigCheck=false) {
	if (url == null) return false;
	if (request_method == null) request_method = 'get';
	const errorMsg = "Unfortunately, the REDCap server was not able to reach the web address you provided and thus was not able to verify it as valid.<div style='font-size:13px;padding:20px 0 5px;color:#C00000;'>Not verifiable: &nbsp;<b>"+url+"</b></div>";
	const errorTitle = "<img src='"+app_path_images+"cross.png' style='vertical-align:middle;'> <span style='color:#C00000;vertical-align:middle;'>Failed to verify web address</span>";
	// Start "working..." progress bar
	showProgress(1,300);
	// Do ajax request to test the URL
	const endpoint = useConfigCheck 
		? (app_path_webroot+'ControlCenter/check_server_ping.php')
		: (app_path_webroot+'ProjectGeneral/test_http_request.php');
	const params = {
		url: url,
	}
	params[useConfigCheck ? 'type' : 'request_method'] = request_method;
	const thisAjax = $.post(endpoint, params, function(data) {
		showProgress(0,0);
		if (data == '1') {
			simpleDialog("The web address is a valid URL and was able to be reached by the REDCap server.<div style='font-size:13px;padding:20px 0 5px;color:green;'>Valid: &nbsp;<b>"+htmlspecialchars(url)+"</b></div>","<img src='"+app_path_images+"tick.png' style='vertical-align:middle;'> <span style='color:green;vertical-align:middle;'>Success!</span>");
		} else {
			simpleDialog(errorMsg, errorTitle);
			// If provided javascript to eval upon failure, the eval it here
			if (evalJsOnFail != null) eval(evalJsOnFail);
		}
	});
	// If does not finish after X seconds, then throw error msg
	var maxAjaxTime = 10; // seconds
	setTimeout(function(){
		if (thisAjax.readyState == 1) {
			thisAjax.abort();
			showProgress(0,0);
			simpleDialog(errorMsg, errorTitle);
			// If provided javascript to eval upon failure, the eval it here
			if (evalJsOnFail != null) eval(evalJsOnFail);
		}
	},maxAjaxTime*1000);
}

// My Projects table: Get records/fields/instruments counts via ajax
function getRecordOrFieldCountsMyProjects(thistype, theseVisiblePids) {
	var num, numf;
	// Get projects counts via ajax
	$.post(app_path_webroot+'ProjectGeneral/project_stats_ajax.php',{ type: thistype, pids: theseVisiblePids }, function(data){
		if (data != '0') {
			// Parse JSON
			var json = jQuery.parseJSON(data);
			// Loop through each project
			if (thistype == 'records') {
				// RECORDS
				for (var this_pid in json) {
					num = json[this_pid]['r']+"";
					numf = num.replace(/\D/g,'');
					$('.pid-cntr-'+this_pid).html('<span class="pid-cnt-h">'+numf+'</span>'+num);
				}
				// Get list of more pid's to process
				var nextVisiblePids = json.next_pids;
				if (nextVisiblePids.length > 0) {
					// DO MORE
					getRecordOrFieldCountsMyProjects('records', nextVisiblePids);
				}
			} else if (thistype == 'fields') {
				// FIELDS/INSTRUMENTS
				for (var this_pid in json) {
					num = json[this_pid]['f']+"";
					numf = num.replace(/\D/g,'');
					$('.pid-cntf-'+this_pid).html('<span class="pid-cnt-h">'+numf+'</span>'+num);
					$('.pid-cnti-'+this_pid).html(json[this_pid]['i']);
				}
			}
		}
	});
}

// In a checkbox coding that gets used as the input name, replace a dot for a pipe for PHP compatibility
function replaceDotInCheckboxCoding(code)
{
	return code.replace(/\./g, "|");
}

// Display a simple modal dialog for a desired time (alternative to jQueryUI dialog) - no buttons or anything fancy
function simpleDialogAlt(msg_div_ob, displayTime, width, jsOnHide) {
	if (msg_div_ob.length) {
		// Set time that dialog is displayed before disappearing (default 2 seconds)
		if (displayTime == null) displayTime = 2;
		// Create modal overlay
		var randnum = Math.floor(Math.random()*10000000000000000);
		var id = "overlay_"+randnum;
		$('body').append('<div id="'+id+'" class="ui-widget-overlay" style="background-color:#555;z-index:998;display:none;"></div>');
		$('#'+id).height( $(document).height() ).width( $(document).width() ).show();
		// If msg_div_ob is a string and not an object, then convert to object
		if (jQuery.type(msg_div_ob) == 'string') {
			$('body').append('<div id="popup_'+randnum+'" style="display:none;padding:20px;background-color:#fff;border:1px solid #777;">'+msg_div_ob+'</div>');
			msg_div_ob = $('#popup_'+randnum);
		}
		// Set div's absolute position and z-index
		msg_div_ob.css({'z-index':'999','position':'absolute'})
		// Set width of div, if set
		if (width != null && isNumeric(width)) msg_div_ob.width(width);
		// Show the div on top of overlay
		msg_div_ob.show().position({ my: "center", at: "center", of: window }).hide().show('fade','fast');
		// After set time, make div disappear
		setTimeout(function(){
			$('#'+id).remove();
			msg_div_ob.hide('fade',1000);
			// Eval JavaScript
			if (jsOnHide != null) {
				try{ eval(jsOnHide); }catch(e){ }
			}
		},(displayTime*1000));
	}
}

/** @var object Keeps track of open dialogs */
const simpleDialogOpened = {};

// Display jQuery UI dialog with Close button (provide id, title, content, width, onClose JavaScript event as string)
function simpleDialog(content,title,id,width,onCloseJs,closeBtnTxt,okBtnJs,okBtnTxt,autoOpen,customClasses) {
	// Hash arguments; if a same dialog is registered as open, return
	const argsHash = fnv1aHash(arguments);
	if (simpleDialogOpened[argsHash]) return;
	// Mark dialog as open
	simpleDialogOpened[argsHash] = true;
	if (typeof autoOpen == 'undefined') autoOpen = true;
	// If no id is provided, create invisible div on the fly to use as dialog container
	var idDefined = true;
	if (id == null || trim(id) == '') {
		id = "popup"+Math.floor(Math.random()*10000000000000000);
		idDefined = false;
	}
	// If this DOM element doesn't exist yet, then add it and set title/content
	if ($('#'+id).length < 1) {
		var existInDom = false;
		initDialog(id);
	} else {
		if (title == null || title == '') title = $('#'+id).attr('title');
		var existInDom = true;
		if (!$('#'+id).hasClass('simpleDialog')) $('#'+id).addClass('simpleDialog');
	}
	// Set content
	if (content != null && content != '') $('#'+id).html(content);
	// Add invisible element at beginning of dialog content to prevent auto-focus issues on inputs and buttons
	$('#'+id).prepend('<span class="ui-helper-hidden-accessible"><input id="'+id+'_ui_helper_hidden_accessible_input" type="text"/></span>');
	// default title
	if (title == null) title = RCView.tt('alerts_24', 'span', { style: 'color:#555;font-weight:normal;' }, 'Alert');
	// Set parameters
	if (!isNumeric(width)) width = 500; // default width
	// Set default button text
	if (okBtnTxt == null) {
		// Default "okay" text for secondary button
		okBtnTxt = RCView.getLangStringByKey('design_401', 'Okay');
		// Default "cancel" text for first button when have 2 buttons
		if (okBtnJs != null && closeBtnTxt == null) closeBtnTxt = RCView.getLangStringByKey('global_53', 'Cancel');
	}
	if (closeBtnTxt == null) {
		// Default "close" text for single button
		closeBtnTxt = RCView.getLangStringByKey('calendar_popup_01', 'Close');
	}
	// Set up button(s)
	if (okBtnJs == null) {
		// Only show a Close button
		var btnClass = 'close-button';
		if(onCloseJs === 'delete_iframe'){
		  btnClass = 'close-button hidden';
		}
		var btns =	[{ text: closeBtnTxt, 'class': btnClass, click: function() {
						// Destroy dialog and remove div from DOM if was created on the fly
						try{ $(this).dialog('close').dialog('destroy'); }catch(e){ }
						if (!idDefined) $('#'+id).remove();
					} }];
	} else {
		// Show two buttons
		var btns =	[{ text: closeBtnTxt, 'class': 'close-button', click: function() {
						// Destroy dialog and remove div from DOM if was created on the fly
						try{ $(this).dialog('close').dialog('destroy'); }catch(e){ }
						if (!idDefined) $('#'+id).remove();
					}},
					{text: okBtnTxt, 'class': 'ok-button', click: function() {
						// If okBtnJs was provided, then eval it to execute
						if (okBtnJs != null) {
							if (typeof(okBtnJs) == 'string') {
								eval(okBtnJs);
							} else {
								var okBtnJsFunc = okBtnJs;
								eval("okBtnJsFunc()");
							}
						}
						// Destroy dialog and remove div from DOM if was created on the fly
						clearCache();
						$(this).dialog('destroy');
						if (!idDefined) $('#'+id).remove();
					}}];
	}
	// Override function (causes annoying scrolling)
	const orig_focusTabbable = $.ui.dialog.prototype._focusTabbable;
	$.ui.dialog.prototype._focusTabbable = function() {};
	function clearCache() {
		// Mark dialog as closed
		delete simpleDialogOpened[argsHash];
		// Restore the annoying function
		$.ui.dialog.prototype._focusTabbable = orig_focusTabbable;
	}
	// Show dialog
	const opts = {
		bgiframe: true,
		classes: { "ui-dialog": customClasses ?? null },
		modal: true,
		width: width,
		buttons: btns,
		autoOpen: autoOpen,
		close: clearCache
	};
	if (typeof title === 'string') {
		opts.title = title;
	}
	else if (typeof title === 'object') {
		opts.create = function(event, ui) {
			$(this).parents('.ui-dialog').find('.ui-dialog-title').html('').append(title);
		};
	}
	$('#'+id).dialog(opts);
	// If Javascript is provided for onClose event, then set it here
	if (onCloseJs != null) {
		// Test Cases
		// simpleDialog('a', 'b', null, null, 'alert(1)')
		// simpleDialog('a', 'b', null, null, function(){alert(2)})
		// (function(){ var closure = function(){alert(3)}; simpleDialog('a', 'b', null, null, closure); })()
		// (function(){ var closure = function(){alert(4)}; simpleDialog('a', 'b', null, null, function(){closure()}); })()
		
		if(onCloseJs == 'delete_iframe'){
			var dialogcloseFunc = function(){window.location.reload()};
		}else{
			var dialogcloseFunc = (typeof(onCloseJs) == 'string') ? function(){eval(onCloseJs)} : onCloseJs;
		}
		$('#'+id).bind('dialogclose', dialogcloseFunc);
	}
	// If div already existed in DOM beforehand (i.e. wasn't created here on the fly), then re-add title to div because it gets lost when converted to dialog
	if (existInDom && ('' + $('#'+id).attr('title')) == '') $('#'+id).attr('title', title);
	setTimeout(function() {
		// Focus designated or first element
		let $focuselement = $('#'+id).find('.initial-focus');
		if ($focuselement.length == 0) $focuselement = $('#'+id).find('input, textarea, button').first();
		$focuselement.get(0)?.focus();
	}, 10);
}

// Convert HTML <br /> tags to new lines \n
function br2nl(val) {
	if (typeof val == "undefined") return "";
	return val.replace(/<br\s*\/?>/mg,"\n");
};

// Convert new lines \n to HTML <br /> tags
function nl2br(val) {
	if (typeof val == "undefined" || typeof val == "object" || typeof val == "array") return "";
	return val.replace(/\n/g,"<br />");
};

// Open dialog to allow user to set up secondary/tertiary email for their REDCap account
function setUpAdditionalEmails() {
	// First, load a dialog via ajax
	$.post(app_path_webroot+'Profile/set_up_emails.php',{ action: 'view' },function(data){
		var json_data = jQuery.parseJSON(data);
		initDialog('setUpAdditionalEmails');
		$('#setUpAdditionalEmails').addClass('simpleDialog').html(json_data.popupContent);
		$('#setUpAdditionalEmails').dialog({ bgiframe: true, modal: true, width: 600, title: json_data.popupTitle, buttons: [
			{ text: 'Cancel',click: function(){
				$(this).dialog('destroy');
			}},
			{ text: json_data.saveBtnTxt, click: function(){
				$('#setUpAdditionalEmails').parent().find('.ui-dialog-buttonpane button').button("disable");
				saveAdditionalEmails();
				$('#setUpAdditionalEmails').parent().find('.ui-dialog-buttonpane button').button("enable");
			}}
		] });
		$('#setUpAdditionalEmails').parent().find('.ui-dialog-buttonpane button').button("enable");
	});
}

// Save secondary/tertiary email for their REDCap account
function saveAdditionalEmails() {
	// Get new email value
	var new_email = $('#add_new_email').val();
	// Make sure it has a value
	if (new_email == '') {
		simpleDialog("Please enter a new email address");
		return false;
	}
	// Validate that emails match
	if (!validateEmailMatch('add_new_email','add_new_email_dup')) {
		return false;
	}
	// Make sure this email isn't the same as existing ones for this user
	if ($('#existing_user_email').val() == new_email || ($('#existing_user_email2').val() != '' && $('#existing_user_email2').val() == new_email)
		|| ($('#existing_user_email3').val() != '' && $('#existing_user_email3').val() == new_email)) {
		simpleDialog("The new email address that you entered is an email already associated with this account. Please enter another email address if you would still like to add one.");
		return false;
	}
	// Save data via ajax
	$.post(app_path_webroot+'Profile/set_up_emails.php',{ action: 'save', add_new_email: new_email },function(data){
		var json_data = jQuery.parseJSON(data);
		if (json_data.response != '1') { alert(woops); return false; }
		simpleDialog(json_data.popupContent,json_data.popupTitle,null,600,"window.location.reload();");
		if ($('#setUpAdditionalEmails').hasClass('ui-dialog-content')) $('#setUpAdditionalEmails').dialog('destroy');
	});
}

// Validation that 2 email fields match (when forcing user to re-enter email)
function validateEmailMatch(email1id,email2id) {
	$('#'+email1id).val( trim($('#'+email1id).val()) );
	$('#'+email2id).val( trim($('#'+email2id).val()) );
	if ($('#'+email1id).val().length > 0 && $('#'+email1id).val() != $('#'+email2id).val()) {
		// Display error dialog and put focus back on second field
		simpleDialog("The re-entered email address did not match the first. Please re-enter your email address.",null,null,null,"$('#"+email2id+"').focus();");
		return false;
	}
	return true;
}

// Check if an email address is acceptable regarding the "domain allowlist for user emails" (if enabled)
function emailInDomainAllowlist(ob,displayErrorMsg) {
	if (email_domain_allowlist.length > 0) {
		var thisEmail = trim($(ob).val());
		if (thisEmail.length < 1) return null;
		if (displayErrorMsg == null) displayErrorMsg = true;
		var thisEmailParts = thisEmail.split('@');
		var thisEmailDomain = thisEmailParts[1].toLowerCase();
		if (!in_array(thisEmailDomain, email_domain_allowlist)) {
			if (displayErrorMsg) {
				var id = $(ob).attr('id');
				var focusJS = (id == null) ? null : "$('#"+id+"').focus();";
				simpleDialog('The domain of the email entered is invalid. (The domain name is the part of the email address after the ampersand.) '
							+'The only acceptable domain names for email addresses are the ones listed below. You may only enter an email that ends '
							+'in one of these domain names. Please try another email address.<br><br>Acceptable domains:<br><b>'
							+email_domain_allowlist.join('<br>')+'</b>','"'+thisEmailDomain+'" is not an acceptable domain name for emails',null,550,focusJS);
			}
			return false;
		} else {
			return true;
		}
	}
	// Return null if domain allowlist not enabled
	return null;
}

// Add/edit/delete a template project
function projectTemplateAction(action,project_id) {
	// Check project_id
	if (project_id == null) project_id = '';
	// Set action button text and action, as well as title/description values
	var hideChooseAnother = 0;
	var cancelBtn  = "Close";
	var cancelAction = "window.location.reload();";
	var actionBtn  = null;
	var actionSave = null;
	var title = '';
	var description = '';
	var enabled = '0';
	var copy_records = '0';
	if (action == 'prompt_delete' || action == 'prompt_addedit') {
		cancelBtn  = "Cancel";
		cancelAction = null;
		// Set flag to hide the "choose another project" when accessing this from inside a project
		if (action == 'prompt_addedit' && project_id != '' && page == 'index.php') {
			hideChooseAnother = 1;
		}
		if (action == 'prompt_addedit' && project_id == '') {
			// Choosing project to add, so don't show Save button
			actionBtn = actionSave = null;
		} else {
			// Set secondary button text and action
			actionBtn = (action == 'prompt_delete') ? "Remove" : "Save";
			actionSave = (action == 'prompt_delete') ? "projectTemplateAction('delete',"+project_id+")" : "projectTemplateAction('addedit',"+project_id+")";
		}
	} else if (action == 'addedit') {
		title = $('#projTemplateTitle').val();
		description = $('#projTemplateDescription').val();
		enabled = $('input[name="projTemplateEnabled"]:checked').val();
		copy_records = $('input[name="projTemplateCopyRecords"]:checked').val();
	}
	// Remove dialog if already exists
	if (!$('#projTemplateDialog').length) initDialog('projTemplateDialog');
	// Perform action via ajax
	$.post(app_path_webroot+'ControlCenter/project_templates_ajax.php',{ copy_records: copy_records, enabled: enabled, action: action, project_id: project_id, title: title, description: description, hideChooseAnother: hideChooseAnother },function(data){
		if (data=='0'){alert(woops);return;}
		var json_data = jQuery.parseJSON(data);
		simpleDialog(json_data.content,json_data.title,'projTemplateDialog',null,cancelAction,cancelBtn,actionSave,actionBtn);
	});
}

// Equivalent to PHP's basename function
function basename(path) {
    return path.replace(/\\/g,'/').replace( /.*\//, '' );
}

// Equivalent to PHP's dirname function
function dirname(path) {
    return path.replace(/\\/g,'/').replace(/\/[^\/]*$/, '');
}

// Equivalent of htmlspecialchars() in PHP
function htmlspecialchars(text) {
	if (text == null) return '';
	return String(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Get case insensitive string position just like PHP's stripos
function stripos(f_haystack, f_needle, f_offset) {
  //  discuss at: http://phpjs.org/functions/stripos/
  // original by: Martijn Wieringa
  //  revised by: Onno Marsman
  //   example 1: stripos('ABC', 'a');
  //   returns 1: 0
  var haystack = (f_haystack + '')
    .toLowerCase();
  var needle = (f_needle + '')
    .toLowerCase();
  var index = 0;
  if ((index = haystack.indexOf(needle, f_offset)) !== -1) {
    return index;
  }
  return false;
}

// Reverse a string just like PHP's strrev
function strrev(s){
    return s.split("").reverse().join("");
}

// Performs a case insensitive match of a substring in a string (used in logic)
function contains(haystack, needle) {
	return (stripos(haystack, needle) !== false);
}

// Performs a case insensitive match of a substring in a string if NOT MATCHED (used in logic)
function not_contain(haystack, needle) {
	return (stripos(haystack, needle) === false);
}

// Replace inside a string
function replace_text(haystack, search, replace) {
	return haystack.replaceAll(search, replace);
}

// Checks if string begins with a substring - case insensitive match (used in logic)
function starts_with(haystack, needle) {
    return (needle === "" || stripos(haystack, needle) === 0);
}

// Checks if string ends with a substring - case insensitive match (used in logic)
function ends_with(haystack, needle) {
    return starts_with(strrev(haystack), strrev(needle));
}

// Escape HTML (similar to PHP's htmlspecialchars)
function escapeHtml(text) {
	var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Get iOS version
function iOSversion() {
	if (isIOS) {
		if (navigator.platform === 'MacIntel') {
			// iOS 13+ on iPads
			var v = (navigator.appVersion).match(/Version\/(\d+)/);
		} else {
			// Everything else iOS
			var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
		}
		// Fallback if regex doesn't match (e.g., KioskPro or other custom user agents)
		if (!v || v.length < 2) {
			// Return a high default version (99) to ensure survey buttons are functional
			// Users on devices with unidentifiable iOS versions will get full feature support
			return 99;
		}
		return parseInt(v[1], 10);
  }
	return false;
}

// Toggle displaying the Twilio Auth Token (for security)
function showPasswordField(input_name) {
	$('input[name="'+input_name+'"]').clone().attr('type','text').attr('size','60').width(260).insertAfter('input[name="'+input_name+'"]').prev().remove();
}

// Report REDCap stats via direct AJAX call
function reportStatsAjax(stats_reporting_url_string, show_cc_confirm_msg, setAutoReportingOnSuccess) {
	if (setAutoReportingOnSuccess == null) setAutoReportingOnSuccess = false;
	if (show_cc_confirm_msg == null) show_cc_confirm_msg = false;
	if (show_cc_confirm_msg) showProgress(1);
	// If the URL is longer than 2000 characters, then break off into separate request for modules
	var param_modules;
	if (stats_reporting_url_string.length > 2000) {
		url_array = stats_reporting_url_string.split('&modules=');
		stats_reporting_url_string = url_array[0];
		param_modules = { modules: decodeURIComponent(url_array[1]) };
	}
	// Ajax call to report stats
	var thisAjax = $.ajax({ type: 'GET', crossDomain: true, url: stats_reporting_url_string,
		success: function(data) {
			if (data != '1') {
				// Ajax method failed so try server-side
				reportStatsServerSide(show_cc_confirm_msg, setAutoReportingOnSuccess);
			} else {
				// Set REDCap stats reporting to "auto"
				if (setAutoReportingOnSuccess) reportStatsSetAuto();

				// Now report External Module stats separately if the URL is more than 2000 characters
				if (param_modules != null) {
					$.ajax({ type: 'POST', crossDomain: true, url: stats_reporting_url_string, data: param_modules, success: function(data) { }});
				}

				// Obtain MTB URL to call
				$.get(app_path_webroot+'ControlCenter/report_site_stats.php?report_mtb_stats=1',{ },function(url){
					if (url != '0') {
						// Send MTB stats
						$.ajax({ type: 'GET', crossDomain: true, url: url });
					}
				});

				// Save date for auto_report_stats_last_sent, and obtain JSON for library stats to send next
				$.get(app_path_webroot+'ControlCenter/report_site_stats.php?report_library_stats=1',{ },function(data){
					// Parse the shared library params and url
					var json_data = $.parseJSON(data);
					// Now report Shared Library stats
					$.ajax({ type: 'POST', crossDomain: true, url: json_data.url, data: json_data.params, success: function(data) { }});
				});

				// Obtain pub matching stats to send
				$.get(app_path_webroot+'ControlCenter/report_site_stats.php?report_pub_matching_stats=1',{ },function(data){
					// If Pub Matching not enabled, then stop
					if (data == '0') {
						if (show_cc_confirm_msg) {
							window.location.href = app_path_webroot + "ControlCenter/index.php?sentstats=1";
						}
						showProgress(0,0);
						return;
					}
					// Parse the pub matching params and url
					var json_data = $.parseJSON(data);
					// Now report Pub Matching stats
					$.ajax({ type: 'POST', crossDomain: true, url: json_data.url, data: json_data.params, success: function(data) {
							if (show_cc_confirm_msg) {
								window.location.href = app_path_webroot + "ControlCenter/index.php?sentstats=1";
							}
							showProgress(0,0);
							return;
						}});
				});
			}
		},
		error: function(e) {
			// Ajax method failed so try server-side
			reportStatsServerSide(show_cc_confirm_msg, setAutoReportingOnSuccess);
		}
	});
	// If Ajax call does not return after X seconds, then try server-side
	var maxAjaxTime = 30; // seconds
	setTimeout(function(){
		if (thisAjax.readyState == 1) {
			// Abort, which will trigger ajax error
			thisAjax.abort();
		}
	},maxAjaxTime*1000);
}

// Report REDCap stats via server-side method if direct cross-domain ajax call fails
function reportStatsServerSide(show_cc_confirm_msg, setAutoReportingOnSuccess) {
	if (setAutoReportingOnSuccess == null) setAutoReportingOnSuccess = false;
	$.get(app_path_webroot+'ControlCenter/report_site_stats.php',{ },function(data) {
		showProgress(0,0);
		var redirectUrl = app_path_webroot + "ControlCenter/index.php?sentstats="+(data == '1' ? '1' : 'fail');		
		// Set REDCap stats reporting to "auto"
		if (setAutoReportingOnSuccess) {
			if (data == '1') {
				reportStatsSetAuto(redirectUrl);
			} else {
				simpleDialog("Sorry, but it appears that this REDCap installation is not able to report stats automatically, so you will need to continue to submit your stats manually. "
							+"This often occurs when the REDCap server cannot communicate with the world wide web and/or the REDCap user's network is not able to reach the world wide web."
							+"<br><br><i>NOTE: If you are just sending your REDCap stats for the very first time today, then try this again in a few days. There is sometimes a lag time when "
							+"stats are reported for the first time.</i>",'AUTO-REPORTING FAILED!');
			}
		} else if (show_cc_confirm_msg) {
			window.location.href = redirectUrl;
		}
	});
}

// Set REDCap stats reporting to "auto"
function reportStatsSetAuto(redirectUrl) {
	if (redirectUrl == null) redirectUrl = false;
	$.post(app_path_webroot+'ControlCenter/report_site_stats.php',{ set_auto_reporting: 1 },function(data){
		var js = redirectUrl ? 'window.location.href = redirectUrl;' : 'window.location.reload();';
		simpleDialog("<div style='color:green;'><img src='"+app_path_images+"tick.png'> Your REDCap stats are able to be reported automatically, so <b>stats reporting has now been set to AUTO-REPORTING</b>. You will no longer have to submit your stats manually.</div>",
			'AUTO-REPORTING SUCCESSFUL!',null,null,js);
	});	
}

// Decode HTML character codes
function html_entity_decode(text) {
    var entities = [
        ['apos', '\''],
        ['quot', '"'],
        ['amp', '&'],
        ['lt', '<'],
        ['gt', '>']
    ];
    for (var i = 0, max = entities.length; i < max; ++i)
        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);
    return text;
}

/**
  * Load a given css file
  */
loadCSS = function(href) {
    var cssLink = $("<link rel='stylesheet' type='text/css' href='"+href+"'>");
    $("head").append(cssLink);
};

/**
 * Load a given javascript file
 */
loadJS = function(src) {
    var jsLink = $("<script type='text/javascript' src='"+src+"'>");
    $("head").append(jsLink);
};

// Load a javascript file via ajax
jQuery.loadScript = function (url, callback) {
    jQuery.ajax({
        url: url,
        dataType: 'script',
        success: callback,
        async: true
    });
}

// Get width of scrollbar
function getScrollBarWidth() {
  var inner = document.createElement('p');
  inner.style.width = "100%";
  inner.style.height = "200px";

  var outer = document.createElement('div');
  outer.style.position = "absolute";
  outer.style.top = "0px";
  outer.style.left = "0px";
  outer.style.visibility = "hidden";
  outer.style.width = "200px";
  outer.style.height = "150px";
  outer.style.overflow = "hidden";
  outer.appendChild (inner);

  document.body.appendChild (outer);
  var w1 = inner.offsetWidth;
  outer.style.overflow = 'scroll';
  var w2 = inner.offsetWidth;
  if (w1 == w2) w2 = outer.clientWidth;

  document.body.removeChild (outer);

  return (w1 - w2);
};

// Display project left-hand menu if hidden on mobile
function toggleProjectMenuMobile(ob) {
	// Don't do anything if on login page
	if ($('#redcap_login_a38us_09i85').length || $('#redcap_login_openid_Re8D2_8uiMn').length) return false;
	// Check left-hand menu
	if (ob.hasClass('d-md-block')) {
		ob.css('top',$(window).scrollTop());
		ob.removeClass('d-md-block');
		ob.removeClass('d-none');
	} else {
		ob.css('top','0px');
		ob.addClass('d-md-block');
		ob.addClass('d-none');
	}
	ob.css('z-index','1002');
	$('#fade').toggleClass('black_overlay').toggle();
}

function areYouSure(callBack){
  simpleDialog('Are you sure you want to cancel this request?','Cancel Request',1,400);
  $confirm =  $('<button>',{
    'class': 'ui-button ui-corner-all ui-widget',
    text: 'Submit'
  }).bind('click', function(){
    callBack('yes');
  });
  $('body').find('.ui-dialog-buttonset').addClass('cancel-request-dialog').append($confirm);
}

// Determine if a mobile device based on screen size. Return true if a mobile device.
function isMobileDeviceFunc() {
	var scrollBarWidth = ($(document).height() > $(window).height()) ? getScrollBarWidth() : 0;
	return ($(window).width()+scrollBarWidth <= maxMobileWidth ? 1 : 0);
}

// Detect when an element's height changes
function onElementHeightChange(elm, callback){
    var lastHeight = elm.clientHeight, newHeight;
    (function run(){
        newHeight = elm.clientHeight;
        if( lastHeight != newHeight )
            callback();
        lastHeight = newHeight;
        if( elm.onElementHeightChangeTimer )
            clearTimeout(elm.onElementHeightChangeTimer);
        elm.onElementHeightChangeTimer = setTimeout(run, 200);
    })();
}

// Send test email for textarea preview
function textareaTestPreviewEmail(contentsSelector, addSurveyLink, subjectSelector, fromSelector, survey_id) {
	if (typeof survey_id == 'undefined' || !isNumeric(survey_id)) survey_id = '';
	$.post(app_path_webroot+'ProjectGeneral/html_preview.php?pid='+pid,{
	    contents: $(contentsSelector).val(),
        subject: $(subjectSelector).val(),
        from: $(fromSelector).text(),
        addSurveyLink: addSurveyLink,
        survey_id: survey_id
    },function(data){
		simpleDialog(lang.survey_1609+' '+data,lang.survey_1288);
	});
}

// Check if we are inside an iframe
function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}
// Check for invalid characters in record names
// Returns TRUE if valid, else returns error message.
function recordNameValid(id) {
	var valid = true;
	// Don't allow pound signs in record names
	if (/#/g.test(id)) {
		valid = "Pound signs (#) are not allowed in record names! Please enter another record name.";
	}
	// Don't allow apostrophes in record names
	if (/'/g.test(id)) {
		valid = "Apostrophes (') are not allowed in record names! Please enter another record name.";
	}
	// Don't allow ampersands in record names
	if (/&/g.test(id)) {
		valid = "Ampersands (&) are not allowed in record names! Please enter another record name.";
	}
	// Don't allow plus signs in record names
	if (/\+/g.test(id)) {
		valid = "Plus signs (+) are not allowed in record names! Please enter another record name.";
	}
	// Don't allow tabs in record names
	if (/\t/g.test(id)) {
		valid = "Tab characters are not allowed in record names! Please enter another record name.";
	}
	return valid;
}

function initTinyMCEglobal(selector, compact, readonly, enable_ai_btn) {
	if (typeof tinymce == 'undefined') loadJS(app_path_webroot+"Resources/webpack/css/tinymce/tinymce.min.js");
	if (typeof selector == 'undefined') selector = 'mceEditor';
	if (typeof compact == 'undefined') compact = false;
	if (typeof readonly == 'undefined') readonly = false;
	if (typeof enable_ai_btn == 'undefined') enable_ai_btn = true;
	// Load the TinyMCE Mention plugin, if being used
	if (typeof tinymceMention == 'undefined' && typeof mentionsSettings != 'undefined') {
		loadJS(app_path_webroot+"Resources/js/Libraries/tinymce.mention.js");
	}
	// Disable image embedding for @RICHTEXT action tag on public surveys
	var this_rich_text_attachment_embed_enabled = rich_text_attachment_embed_enabled;
	var hash = getParameterByName('s');
	var isSurvey = is_survey() && hash != '';
	var isFieldWithRichTextActionTag = (selector == 'notesbox-richtext-left' || selector == 'notesbox-richtext-right');
	var isPublicSurvey = (isSurvey && hash.toUpperCase() === hash); // The hash of a public survey is always all caps, while private survey links are not.
	var imageuploadIcon = (rich_text_image_embed_enabled && !(isPublicSurvey && isFieldWithRichTextActionTag)) ? 'image' : ' ';
	var fileuploadIcon = (rich_text_attachment_embed_enabled && !isFieldWithRichTextActionTag) ? 'fileupload' : ' ';
	var fileimageicons = trim(imageuploadIcon + ' ' + fileuploadIcon);
	var openaiIcon = openAIImproveTextServiceEnabled && enable_ai_btn ? ' openai' : '';
	// Set toolbars
	var toolbar1defaults = 'fontfamily blocks fontsize bold italic underline strikethrough forecolor backcolor';
	var toolbar2defaults = 'align bullist numlist outdent indent table pre hr link '+fileimageicons+' fullscreen searchreplace removeformat undo redo code'+openaiIcon;
	var toolbar1defaultsMobile = 'blocks bold italic forecolor backcolor underline strikethrough';
	var toolbar2defaultsMobile = 'align bullist numlist  link pre image table fullscreen'+openaiIcon;
	var toolbar1 = '', toolbar2 = '', menudefaults = { title: '', items: '' };
	// Use textarea's native height to determine size of editor
	var height = $("."+selector+":first").outerHeight();
	if (!isNumeric(height)) {
		height = 175;
	} else if (height < 100) {
		height = 100;
	}
	height += 115; // Add height to compensate for top/bottom toolbars
	if (isMobileDevice) {
		var toolbar1 = toolbar1defaultsMobile;
		var toolbar2 = toolbar2defaultsMobile;
	} else if (!compact) {
		var toolbar1 = toolbar1defaults;
		var toolbar2 = toolbar2defaults;
	}
	try {
		tinymce.init({
			height: height,
			license_key: 'gpl',
			font_family_formats: 'Open Sans=Open Sans; Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats',
			promotion: false,
			editable_root: !readonly,
			entity_encoding : "raw",
			default_link_target: '_blank',
			selector: "."+selector,
			menubar: compact,
			menu: {
				file: menudefaults, 	// hidden
				edit: menudefaults, 	// hidden
				view: menudefaults, 	// hidden
				insert: menudefaults, // hidden
				tools: menudefaults 	// hidden
				// format: show all options for this
				// table: show all options for this
			},
			branding: false,
			statusbar: true,
			elementpath: false, // Hide this, since it oddly renders below the textarea.
			plugins: 'autolink lists link image searchreplace code fullscreen table directionality hr media',
			toolbar1: toolbar1,
			toolbar2: toolbar2,
			contextmenu: "copy | link image inserttable | cell row column deletetable",
			content_css: app_path_webroot + "Resources/webpack/css/bootstrap.min.css," + app_path_webroot + "Resources/webpack/css/fontawesome/css/all.min.css," + app_path_webroot + "Resources/css/style.css",
			relative_urls: false,
			convert_urls: false,
			media_alt_source: false,
			media_poster: false,
			extended_valid_elements: 'i[class]',
			paste_postprocess: function (plugin, args) {
				args.node.innerHTML = cleanHTML(args.node.innerHTML);
				tinymce.triggerSave();
			},
			setup: function (editor) {
				const triggerChangeEvent = function() {
					try {
						tinymce.triggerSave();
						const element = tinymce.activeEditor.getElement();
						var inputEvent = new Event('input');
						element.dispatchEvent(inputEvent);
						var changeEvent = new Event('change');
						element.dispatchEvent(changeEvent);
						// If on data entry form or survey, set flag to denote a change has been made
						if (page == 'surveys/index.php' || page == 'DataEntry/index.php') {
							// Get field name from target
							var field = element.getAttribute('name') ?? '';
							setDataEntryFormValuesChanged(field);
						}
					} catch (error) { }
				}
				editor.on('click', function (){
					let editorElement = tinymce.activeEditor.getElement();
					if (editorElement.classList.contains('descriptive_popup_text')) {
						let editorDiv = document.querySelector('.tox.tox-tinymce.tox-edit-focus');
						if (editorDiv) {
							editorDiv.classList.remove('tox-edit-focus');
							let editArea = document.querySelector('.tox-edit-area');
							editArea.classList.add('rich_text_border_style');
						}
					}
				});
				// Keep original element in sync with editor content (for posting value)
				editor.on('keyup', triggerChangeEvent)
				editor.on('change', triggerChangeEvent)
				// Trigger blur on original element (in case it has JavaScript events tied to it)
				editor.on('blur', function () {
					try {
						tinymce.triggerSave();
						$(tinymce.activeEditor.getElement()).trigger('blur');
					} catch (e) { }
				});
				// Add file attachment button to toolbar
				if (typeof pid != 'undefined' && pid != '') {
					editor.ui.registry.addIcon('paper-clip-custom', '<svg height="20" width="20" viewBox="0 0 512 512"><path d="M396.2 83.8c-24.4-24.4-64-24.4-88.4 0l-184 184c-42.1 42.1-42.1 110.3 0 152.4s110.3 42.1 152.4 0l152-152c10.9-10.9 28.7-10.9 39.6 0s10.9 28.7 0 39.6l-152 152c-64 64-167.6 64-231.6 0s-64-167.6 0-231.6l184-184c46.3-46.3 121.3-46.3 167.6 0s46.3 121.3 0 167.6l-176 176c-28.6 28.6-75 28.6-103.6 0s-28.6-75 0-103.6l144-144c10.9-10.9 28.7-10.9 39.6 0s10.9 28.7 0 39.6l-144 144c-6.7 6.7-6.7 17.7 0 24.4s17.7 6.7 24.4 0l176-176c24.4-24.4 24.4-64 0-88.4z"/></svg>');
					editor.ui.registry.addButton('fileupload', { icon: 'paper-clip-custom', tooltip: 'Attach a file', onAction: function(){ rich_text_attachment_dialog(); } });
				}
				// Add pre/code button to toolbar
				editor.ui.registry.addIcon('preformatted-custom', '<svg height="20" width="20" viewBox="0 0 640 512"><path d="M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z"/></svg>');
				editor.ui.registry.addButton('pre', { icon: 'preformatted-custom', tooltip: 'Preformatted code block', onAction: function(){ editor.insertContent('<pre>'+tinymce.activeEditor.selection.getContent()+'</pre>'); } });
				if (openAIImproveTextServiceEnabled) {
					editor.ui.registry.addIcon('openai-improve-text', '<svg height="20" width="20" viewBox="0 0 640 512"><path fill="#eb03eb" d="M464 6.1c9.5-8.5 24-8.1 33 .9l8 8c9 9 9.4 23.5 .9 33l-85.8 95.9c-2.6 2.9-4.1 6.7-4.1 10.7l0 21.4c0 8.8-7.2 16-16 16l-15.8 0c-4.6 0-8.9 1.9-11.9 5.3L100.7 500.9C94.3 508 85.3 512 75.8 512c-8.8 0-17.3-3.5-23.5-9.8L9.7 459.7C3.5 453.4 0 445 0 436.2c0-9.5 4-18.5 11.1-24.8l111.6-99.8c3.4-3 5.3-7.4 5.3-11.9l0-27.6c0-8.8 7.2-16 16-16l34.6 0c3.9 0 7.7-1.5 10.7-4.1L464 6.1zM432 288c3.6 0 6.7 2.4 7.7 5.8l14.8 51.7 51.7 14.8c3.4 1 5.8 4.1 5.8 7.7s-2.4 6.7-5.8 7.7l-51.7 14.8-14.8 51.7c-1 3.4-4.1 5.8-7.7 5.8s-6.7-2.4-7.7-5.8l-14.8-51.7-51.7-14.8c-3.4-1-5.8-4.1-5.8-7.7s2.4-6.7 5.8-7.7l51.7-14.8 14.8-51.7c1-3.4 4.1-5.8 7.7-5.8zM87.7 69.8l14.8 51.7 51.7 14.8c3.4 1 5.8 4.1 5.8 7.7s-2.4 6.7-5.8 7.7l-51.7 14.8L87.7 218.2c-1 3.4-4.1 5.8-7.7 5.8s-6.7-2.4-7.7-5.8L57.5 166.5 5.8 151.7c-3.4-1-5.8-4.1-5.8-7.7s2.4-6.7 5.8-7.7l51.7-14.8L72.3 69.8c1-3.4 4.1-5.8 7.7-5.8s6.7 2.4 7.7 5.8zM208 0c3.7 0 6.9 2.5 7.8 6.1l6.8 27.3 27.3 6.8c3.6 .9 6.1 4.1 6.1 7.8s-2.5 6.9-6.1 7.8l-27.3 6.8-6.8 27.3c-.9 3.6-4.1 6.1-7.8 6.1s-6.9-2.5-7.8-6.1l-6.8-27.3-27.3-6.8c-3.6-.9-6.1-4.1-6.1-7.8s2.5-6.9 6.1-7.8l27.3-6.8 6.8-27.3c.9-3.6 4.1-6.1 7.8-6.1z"/></svg>');
					editor.ui.registry.addButton('openai', { icon: 'openai-improve-text', tooltip: lang.openai_001, onAction: function(){  openImproveTextByAIPopup(editor.id);return false; } });
				}
			},
			// Embedded image uploading
			file_picker_types: 'image',
			images_upload_handler: rich_text_image_upload_handler,
			browser_spellcheck : true
		});
	} catch(e) { }
}

function rich_text_attachment_dialog()
{
	var dropAreaHtml = "<div class=\"rich-text-attachment-drop-area\">" +
		"                <div class=\"rich-text-attachment-drop-message clearfix\">" +
		"                    <div class='float-start' style='width:100px;'><i class=\"fa-solid fa-cloud-arrow-up fa-3x\"></i></div>" +
		"                    <div class=\"rich-text-attachment-drop-message-text\">"+lang.global_273+"</div>" +
		"                </div>" +
		"            	 <input name=\"rich-text-attachment-file-input\" class=\"rich-text-attachment-file-input\" type=\"file\" onchange='upload_rich_text_attachment_dialog($(this)[0].files[0]);'>" +
		"        		</div>" +
		"				<div class='ms-2 fs14' style='color:#337ab7;'>"+lang.data_entry_63+' '+roundup(maxUploadSizeAttachment/1024/1024,3)+" MB</div>" +
		"				<div class='mt-4 ms-2 fs13' style='line-height:1.2;color:#666;'><i class=\"fa-solid fa-triangle-exclamation fs14 text-dangerrc opacity65\"></i> "+lang.global_274+"</div>";
	simpleDialog(dropAreaHtml, lang.global_272, 'rich-text-upload-dialog', 700, null, lang.global_53);
}

/**
 * create a form to upload a file
 * the form includes a file field, the csrf token and the action that must be performed
 */
function createUploadForm(formName, formFileInputElement)
{
	//create the form
	var form = document.createElement('form');
	form.setAttribute('action', location.href);
	form.setAttribute('method', 'POST');
	form.setAttribute('enctype', 'multipart/form-data');
	// csrftoken
	var csrf_token_input = document.createElement('input');
	csrf_token_input.setAttribute('type', 'hidden');
	csrf_token_input.setAttribute('name', 'redcap_csrf_token');
	csrf_token_input.setAttribute('value', get_csrf_token());
	form.appendChild(csrf_token_input);
	// set the import action
	var action_input = document.createElement('input');
	action_input.setAttribute('type', 'hidden');
	action_input.setAttribute('name', formName);
	form.appendChild(action_input);
	// append the file input field
	form.appendChild(formFileInputElement);
	// make form invisible
	setElementInvisible(form);
	return form;
}

/**
 * sets the style of a DOM element
 *
 * @param {object} element - DOM element
 * @param styleProperties - custom style properties to apply on the element
 */
function setElementStyle(element, styleProperties)
{
	for (var property in styleProperties) {
		if (property in element.style) {
			element.style[property] = styleProperties[property];
		} else {
			alert(woops);
			return;
		}
	}
}

/**
 * make a DOM element invisible
 *
 * @param {object} element DOM element
 */
function setElementInvisible(element)
{
	let styleProperties = {
		opacity: 0,
		position: 'absolute',
		width: 0.1,
		height: 0.1,
		pointerEvents: 'none'
	}
	setElementStyle(element, styleProperties);
}

/**
 * send an ajax request
 *
 * @param {string} method
 * @param {object} data
 * @param {object} options
 */
function sendAjaxRequest(method, data, options = {})
{
	data.redcap_csrf_token = get_csrf_token(); // add the csrf token
	var dfd = $.Deferred();
	var base_params = {
		url: location.href,
		type: method,
		data: data,
		dataType: 'json',
	};
	var params = $.extend(base_params, options);
	$.ajax(params)
		.done( function( response, textStatus, jqXHR ) {
			// on success reload the page to reflect data changes
			dfd.resolve(response);
		}).fail( function( jqXHR, textStatus, errorThrown ) {
		var response = {
			status: "error",
			//message: jqXHR.message
			message: errorThrown
		};
		dfd.reject(response);
	});
	return dfd;
}

function get_csrf_token()
{
	return window.redcap_csrf_token || '';
}

// Upload single file via AJAX
function upload_rich_text_attachment_dialog(file)
{
	// Add file to formdata
	var fd = new FormData();
	fd.append('file', file);
	if (typeof redcap_csrf_token != 'undefined') fd.append('redcap_csrf_token', redcap_csrf_token);
	// Make sure file size is not too large
	if (file.size >= maxUploadSizeAttachment) {
		simpleDialog(lang.sendit_03+' (<b>'+roundup(file.size/1024/1024,1)+' MB</b>)'+lang.period+' '+lang.sendit_04+' '+roundup(maxUploadSizeAttachment/1024/1024)+' MB '+lang.sendit_05, lang.docs_81);
		return;
	}
	$('#rich-text-upload-dialog').dialog('close');
	showProgress(1);
	// Upload the file via AJAX
	var basepage = (page == 'surveys/index.php' && getParameterByName('s') != '')
				? app_path_webroot.replace("/redcap_v"+redcap_version+"/","/")+"surveys/index.php?__passthru="+encodeURIComponent("Design/file_attachment_upload.php")+'&s='+getParameterByName('s')+'&'
				: app_path_webroot+"Design/file_attachment_upload.php?"+(pid=='' ? '' : 'pid='+pid+'&')+'&';
	$.ajax({
		url: basepage+'&embed_attachment=1',
		type: 'post',
		data: fd,
		contentType: false,
		processData: false,
		success: function (response) {
			showProgress(0, 700);
			if (response == '0') {
				// Error
				simpleDialog('<span class="fs12">'+RCView.tt('docs_82')+' <code class="fs13">'+file.name+'</code></span>', RCView.getLangStringByKey('docs_81'));
			} else if (isUrl(response)) {
				// Success
				tinymce.activeEditor.insertContent("<p><a href='"+response+"' style='text-decoration:underline;'>"+file.name+"</a></p><p> </p>");
			} else {
				// Specific error returned
				simpleDialog(response, RCView.getLangStringByKey('docs_81'));
			}
		},
		error: function (response) {
			// Error
			simpleDialog('<span class="fs12">'+RCView.tt('docs_82')+' <code class="fs13">'+file.name+'</code></span>', RCView.getLangStringByKey('docs_81'));
		}
	});
}

const rich_text_image_upload_handler = (blobInfo, progress) => new Promise((resolve, reject) => {
	var basepage = (page == 'surveys/index.php' && getParameterByName('s') != '')
				 ? app_path_webroot.replace("/redcap_v"+redcap_version+"/","/")+"surveys/index.php?__passthru="+encodeURIComponent("Design/file_attachment_upload.php")+'&s='+getParameterByName('s')+'&'
				 : app_path_webroot+"Design/file_attachment_upload.php?"+(pid=='' ? '' : 'pid='+pid+'&')+'&';
	var xhr, formData;
	xhr = new XMLHttpRequest();
	xhr.withCredentials = false;
	xhr.open('POST', basepage+'embed_image=1');
	xhr.upload.onprogress = function (e) {
		progress(e.loaded / e.total * 100);
	};
	xhr.onload = () => {
		if (xhr.status === 403) {
			reject('HTTP Error: ' + xhr.status, { remove: true });
			return;
		}
		if (xhr.status < 200 || xhr.status >= 300) {
			reject('HTTP Error: ' + xhr.status);
			return;
		}
		// We are expecting a URL to be returned
		if (!isUrl(xhr.responseText)) {
			reject('Image upload failed due to an unknown error: ' + xhr.responseText);
			return;
		}
		resolve(xhr.responseText);
	};
	xhr.onerror = () => {
		reject('Image upload failed due to an unknown error. HTTP Error: ' + xhr.status);
	};
	formData = new FormData();
	if (typeof redcap_csrf_token != 'undefined') formData.append('redcap_csrf_token', redcap_csrf_token);
	formData.append('file', blobInfo.blob(), blobInfo.filename());
	xhr.send(formData);
});

// Prevent any auto-filling of text fields by browser methods
function addAutoCompleteToInputs() {
    $(':input[type="text"]:not([autocomplete])').prop("autocomplete", "new-password");
}

// For all links that have target="_blank", automatically add rel="noopener noreferrer"
function sanitizeTargetBlank() {
    $('a[target="_blank"]').each(function(){
        var a = $(this);
        if (location.hostname !== this.hostname) {
            var originalRel = (this.rel === undefined) ? '' : this.rel.toLowerCase();
            var newRel = originalRel.split(" ");
            if (originalRel.indexOf('noopener') === -1) {
                newRel.push('noopener');
            }
            if (originalRel.indexOf('noreferrer') === -1) {
                newRel.push('noreferrer');
            }
            a.attr('rel', newRel.join(" ").trim() );
        }
    });
}

// Load a survey inside an iframe inside a dialog
function openSurveyDialogIframe(survey_url) {
    var width = ($(document).width() < 1000) ? $(document).width()-100 : 1000;
    simpleDialog('<iframe src="'+survey_url+'" type="text/html" frameborder="0" style="width:100%;height:'+($(window).height()-250)+'px;"></iframe>', 'Complete the survey',
        'survey-dialog-iframe', width, null, 'Cancel');
    showProgress(0,0);
}

// Call login reset page via AJAX
function callLoginResetAjax(resettime,logouttime) {
	var params = '';
	// Detect if we're on data entry page or  not
	try {
		var form = getParameterByName('page');
		var rec  = getParameterByName('id');
		if (page == 'DataEntry/index.php' && form != '' && rec != '') {
			params = '?pid='+pid+'&page='+form+'&id='+rec;
			var event_id = getParameterByName('event_id');
			if (event_id != '') params += '&event_id='+event_id;
			var auto_param = getParameterByName('auto');
			if (auto_param != '') params += '&auto='+auto_param;
		}
	} catch(err) {}
	$.get(app_path_webroot+'ProjectGeneral/keep_alive.php'+params, {}, function(data){
		if (data == "1") {
			initAutoLogout(resettime,logouttime);
		} else {
			var showFailureNotice = true;
			try {
				if (page == 'DataEntry/index.php' && getParameterByName('id') != '') {
					showFailureNotice = false;
				}
			} catch(err) {}
			if (showFailureNotice) {
				var lostSessionMsg = "<b>Your REDCap session has expired.</b><br>Click the button below to log in again.";
				$.doTimeout('autoLogoutId4', 1, function(){ $('body').html(''); autoLogoutDialog(lostSessionMsg,true,resettime,logouttime); $('.ui-widget-overlay').css({'opacity': '1', 'background-color':'#AAAAAA'}); }, true);
			}
		}
	});
}

// Initialize auto-logout popup timer and logout reset timer listener
function initAutoLogout(resettime,logouttime) {
	// Do not run pop-up alert if on the login page and not logged in
	if ($('#redcap_login_a38us_09i85').length || $('#redcap_login_openid_Re8D2_8uiMn').length || page == 'Surveys/theme_view.php') {
		return false;
	}
	// Set ajax call at timed interval that is triggered by typing, clicking, or mouse movement (to prevent auto-logout)
	$.doTimeout('autoLogoutResetId', (resettime*60000), function(){
		$('div.container-fluid:first, div.black_overlay, div.ui-dialog, div.ui-widget-overlay, #working_export').bind('keyup mousemove click', function(){
			$(this).unbind('keyup mousemove click');
			// Call login reset page via AJAX
			callLoginResetAjax(resettime,logouttime);
		});
	});
	// Set auto-logout popups to occur at set intervals
	$.doTimeout('autoLogoutId1', ((logouttime-2)*60000), function(){ autoLogoutDialog(window.lang.global_150,false,resettime,logouttime); }, true);
	$.doTimeout('autoLogoutId2', ((logouttime-0.5)*60000), function(){ autoLogoutDialog(window.lang.global_151,false,resettime,logouttime); }, true);
	$.doTimeout('autoLogoutId3', (logouttime*60000), function(){ $('body').html(''); autoLogoutDialog(window.lang.global_152,true,resettime,logouttime); $('.ui-widget-overlay').css({'opacity': '1', 'background-color':'#AAAAAA'}); window.onbeforeunload=function(){ } }, true);
}

// Display dialog pop-up with auto-logout warning text
function autoLogoutDialog(msg,doLogout,resettime,logouttime) {
	// Set dialog content and button text
	var image = (doLogout ? 'cross_big.png' : 'warning.png');
	var classname = (doLogout ? 'red' : 'yellow');
	var content = '<div class="'+classname+'" style="margin:20px 0;"><table cellspacing=10 width=100%><tr>'
		+ '<td><img src="'+app_path_images+image+'"></td>'
		+ '<td style="font-family:verdana;padding-left:10px;">'+msg+'</td></tr></table></div>';
	var btnText = (doLogout ? window.lang.global_148 : window.lang.global_149);
	// Setup up dialog
	var div_id = 'redcapAutoLogoutDialog';
	if ($('#'+div_id).hasClass('ui-dialog-content')) $('#'+div_id).dialog('destroy');
	$('#'+div_id).remove();
	$('body').append('<div id="'+div_id+'" style="display:none;"></div>');
	// Display dialog
	$('#'+div_id).dialog({ bgiframe: true, modal: true, width: 450, title: window.lang.global_147,
		open: function(){ fitDialog(this); $(this).html(content); },
		close: function(){
			if (doLogout){
				// Disable the onbeforeunload so that we don't get an alert before we leave
				window.onbeforeunload = function() { }
				// Reload page to force re-login (don't use window.location.reload() because it can cause a resubmit of Post in some browsers)
				var loc = window.location.href;
				window.location.href = loc;
			} else {
				// Contact the server via AJAX and reset the session
				callLoginResetAjax(resettime,logouttime);
			}
		},
		buttons: [{
			text: btnText,
			click: function() { $(this).dialog("close"); }
		}]
	});
	$('#'+div_id).parent().css('z-index', '1053');
}
//Initialize all sliders on page
function initSliders() {
	$('.slider').each(function(index,item){
		var alignment = $(item).attr('data-align');
		var min = $(item).attr('data-min')*1;
		var max = $(item).attr('data-max')*1;
		var startValue = Math.floor((min+max)/2);
		var step = ((max-min) <= 100) ? 1 : Math.floor((max-min)/100);
		var sliderEnabled = $(item).hasClass('ui-slider');
		if (alignment == null || sliderEnabled) return;
		alignment = alignment.split('-');
		$(item).slider({ value: startValue, min: min, max: max, step: step, orientation: alignment[1] });
		if (alignment[1] === 'vertical') $(item).height(200);
		$(item).slider('disable');
		// Slider IDs on forms are named "slider-[field]"
		if ($(this).prop('id') == null) return;
		var field = $(this).prop('id').substring(7);
		// Only do the rest below if we're on a form/survey
		if (!$('form#form tr#'+field+'-tr').length) return;
		var sliderHandle = $(this).find('.ui-slider-handle');
		// Set to role and other attributes
		sliderHandle.attr('role','slider');
		sliderHandle.attr('aria-orientation',(alignment[1] === 'vertical' ? 'vertical' : 'horizontal'));
		sliderHandle.attr('aria-valuemin',min);
		sliderHandle.attr('aria-valuemax',max);
		// Allow onfocus to enable sliders on forms/surveys, but if it's unchanged when we tab off, then reset the slider again
		sliderHandle.focus(function(){
			if ($(item).attr('locked') == '1') return;
			enableSldr(field);
		});
		sliderHandle.blur(function(){
			if ($('#slider-'+field).attr('modified') != '1') {
				resetSlider(field);
			}
		});
		// Set aria-valuetext
		sliderHandle.attr('aria-valuetext', '50%');
		$(this).keydown(function(event){
			// We round here because we get values like 59.99999999999% sometimes
			if ($(this).attr('data-align').indexOf('-horizontal') > 0) {
				var value = Math.round(sliderHandle[0].style.left.replace('%','').replace(';',''));
			} else {
				var value = Math.round(sliderHandle[0].style.bottom.replace('%','').replace(';',''));
			}
			sliderHandle.attr('aria-valuetext', value + '%');
			// If not tabbing off/blur, then note this field as having been modified
			if (event.keyCode != 9) $('#slider-'+field).attr('modified', '1');
		})
		// Gather labelledby IDs
		var labelledBy = 'label-'+field;
		if ($('#sldrlaba-'+field).length && $('#sldrlaba-'+field).text().trim() != "") {
			labelledBy += ' slider-0means sldrlaba-'+field;
		}
		if ($('#sldrlabb-'+field).length && $('#sldrlabb-'+field).text().trim() != "") {
			labelledBy += ' slider-50means sldrlabb-'+field;
		}
		if ($('#sldrlabc-'+field).length && $('#sldrlabc-'+field).text().trim() != "") {
			labelledBy += ' slider-100means sldrlabc-'+field;
		}
		sliderHandle.attr('aria-labelledby', labelledBy);
	});
}

function updatePipeReceivers(fld, event_id, value) {
	try {
		if (value == '') value = missing_data_replacement_js;
		// Piping: Transmit slider value to all piping receiver spans
		$('.piping_receiver.piperec-' + event_id + '-' + fld).html(value);
		$('.piping_receiver.piperec-' + event_id + '-' + fld + '-value').html(value);
		$('.piping_receiver.piperec-' + event_id + '-' + fld + '-label').html(value);
		// Branching logic and calculations
		calculate(fld);
		doBranching(fld);
	} catch (e) {
	}
}

//Enable sliders when clicking on them
function enableSldr(fld, ev) {
	if (typeof ev == 'undefined') ev = '';
	var min = $('#slider-'+fld).attr('data-min')*1;
	var max = $('#slider-'+fld).attr('data-max')*1;
	var startValue = Math.floor((min+max)/2);
	var step = ((max-min) <= 100) ? 1 : Math.floor((max-min)/100);
	$("#slider-" + fld).slider({
		disabled: false,
		min: min,
		max: max,
		step: step,
		change: function (event, ui) {
			// Set flag as true for data changes
			setDataEntryFormValuesChanged(fld);
			// Set input value
			$('form[name="form"] input[name="' + fld + '"]').val(ui.value);
			// Piping: Transmit slider value to all piping receiver spans
			setTimeout(function(){
				var val = $('form[name="form"] input[name="'+fld+'"]').val()
				if (typeof event_id != 'undefined') updatePipeReceivers(fld, event_id, val);
			}, 10); // This needs to have a delay due to weird infinite loops with the "erase value" prompt for branching logic
		},
		slide: function (event, ui) {
			$('form[name="form"] input[name="' + fld + '"]').val(ui.value);
			// Piping: Transmit slider value to all piping receiver spans
			if (typeof event_id != 'undefined') updatePipeReceivers(fld, event_id, ui.value);
		},
		click: function (event, ui) {
			// Set input value
			$('form[name="form"] input[name="' + fld + '"]').val(ui.value);
			// Piping: Transmit slider value to all piping receiver spans
			if (typeof event_id != 'undefined') updatePipeReceivers(fld, event_id, ui.value);
		}
	});
	if ($('form[name="form"] input[name="'+fld+'"]').val() == '' && ev == 'mousedown') {
		$('form[name="form"] input[name="'+fld+'"]').val(startValue); //Set value to startValue when click on it (prevents ambiguity of value after first click)
		setDataEntryFormValuesChanged(fld);
	}
	$("#sldrmsg-"+fld).css('visibility','hidden');
	if (typeof event_id != 'undefined') updatePipeReceivers(fld, event_id, startValue);
}

// Return random color as RGB value
function getRandomColor() {
	var r = Math.floor(Math.random() * 255);
	var g = Math.floor(Math.random() * 255);
	var b = Math.floor(Math.random() * 255);
	return "rgb(" + r + "," + g + "," + b + ")";
}
// Return chart pattern
function getRandomPattern() {
	var random = Math.floor(Math.random() * window.chartPatternsAll.length);
	return window.chartPatternsAll[random];
}
// Render Smart Chart
window.chartColors = ['rgb(54, 162, 235)','rgb(255, 99, 132)','rgb(255, 205, 86)','rgb(0, 180, 0)','rgb(100, 100, 100)','rgb(165, 87, 87)','rgb(201, 203, 207)','rgb(255,159,64)','rgb(153, 102, 255)'];
window.chartPatterns = ['','','dash','dot','','line-vertical','','plus','line'];
window.chartPatternsAll = ['','','','plus','cross','dash','cross-dash','dot','dot-dash','disc','ring','line','line-vertical','weave','zigzag','zigzag-vertical','diagonal','diagonal-right-left','square','box','triangle','triangle-inverted','diamond','diamond-box'];
function getChartColorByIndex(index) {
	return (isinteger(index) && index >= 0 && index < window.chartColors.length ? window.chartColors[index] : getRandomColor());
}
function getChartPatternByIndex(index) {
	return (isinteger(index) && index >= 0 && index < window.chartPatterns.length ? window.chartPatterns[index] : getRandomPattern());
}
function renderSmartChart(id, type, data, labels, orientation, stacked, xlabel, ylabel, hideyvalues, datasetlabels, xType, yType) {
	var xTypeIsDate = (xType.substring(0, 5) == 'date_');
	var xTypeIsDateTime = (xType.substring(0, 9) == 'datetime_');
	var xdisplayDateFormat = 'YYYY-MM-DD';
	var xIsDate = (xTypeIsDate == true || xTypeIsDateTime == true);
	var xTypeIsTime = (xType == 'time');
	var xTypeIsCategory = (xType == 'category');

	var yTypeIsDate = (yType.substring(0, 5) == 'date_');
	var yTypeIsDateTime = (yType.substring(0, 9) == 'datetime_');
	var ydisplayDateFormat = 'YYYY-MM-DD';
	var yIsDate = (yTypeIsDate == true || yTypeIsDateTime == true);
	var yTypeIsTime = (yType == 'time');

	var displayTimeFormat = 'HH:mm';

	if (xIsDate) {
		xdisplayDateFormat = getDateDisplayFormat(xType);
	}

	if (yIsDate) {
		ydisplayDateFormat = getDateDisplayFormat(yType);
	}
	// Add data
	if (typeof datasetlabels == 'undefined') datasetlabels = [];
	var datasets = [], bg, patt, color;
	var datalen = data.length;
	for (var i = 0; i < datalen; i++) {
		if (type == 'pie' || type == 'donut') {
			bg = new Array();
			for (var k = 0; k < data[i].length; k++) {
				patt = getChartPatternByIndex(k);
				color = getChartColorByIndex(k);
				bg[k] = (patt != '' && typeof redcap_colorblind != 'undefined' && redcap_colorblind == '1') ? pattern.draw(patt, color) : color;
			}
		} else {
			bg = getChartColorByIndex(i);
		}
		datasets.push({ data: data[i], label: datasetlabels[i], backgroundColor: bg, pointRadius: 3, pointHoverRadius: 6, fill: false, borderColor: bg, spanGaps: true});
	}
	// Is it a stacked bar chart?
	if (typeof stacked == 'undefined') stacked = 0;
	if (stacked && (datalen < 1 || type != 'bar')) stacked = 0;
	stacked = (stacked != 0);
	// Axis labels
	if (typeof xlabel == 'undefined') xlabel = '';
	if (typeof ylabel == 'undefined') ylabel = '';
	if (typeof hideyvalues == 'undefined') hideyvalues = false;

	var xTicks = (type == 'bar') ? {beginAtZero:true} : {};
	var yTicks = (type == 'bar') ? {beginAtZero:true} : {};

	if (type == 'line' || type == 'scatter') {
		if (xIsDate) {
			xTicks.callback = function(tickValue, index, ticks) {
				return moment(tickValue).format(xdisplayDateFormat);
			};
		}
		if (yIsDate) {
			yTicks.callback = function(tickValue, index, ticks) {
				return moment(tickValue).format(ydisplayDateFormat);
			};
		}
	}
	var scaleLabelX = { display: (xlabel!=''), labelString: xlabel };
	var scaleLabelY = { display: (ylabel!=''), labelString: ylabel };
	var scales = { xAxes: [{ stacked: stacked, ticks: xTicks, scaleLabel: scaleLabelX }], yAxes: [{ stacked: stacked, ticks: yTicks, scaleLabel: scaleLabelY, display: !hideyvalues }] };

	// if (type == 'scatter') {
	// 	if (xTypeIsTime == true || xTypeIsDate == true || xTypeIsDateTime == true) {
	// 		scales.xAxes[0].ticks = { display: true, maxTicksLimit: 9};
	// 		scales.xAxes[0].gridLines = { display : true };
	// 		scales.xAxes[0].type = 'time';
	// 		scales.xAxes[0].time = { unit: 'day', displayFormats: { day: ((xIsDate == true) ? xdisplayDateFormat : displayTimeFormat) }, tooltipFormat: ((xIsDate == true) ? xdisplayDateFormat : displayTimeFormat)};
	// 		if (xTypeIsTime == true) {
	// 			scales.xAxes[0].time = {
	// 				parser: displayTimeFormat,
	// 				unit: 'hour',
	// 				stepSize: 1,
	// 				displayFormats: {
	// 					hour: displayTimeFormat
	// 				},
	// 				tooltipFormat: displayTimeFormat
	// 			};
	// 		}
	// 	} else {
	// 		if (xTypeIsCategory) {
	// 			scales.xAxes = [{'type' : "category"}];
	// 		} else {
	// 			scales.xAxes = [{'type' : "linear"}];
	// 		}
	// 		if (datasets.length > 0) {
	// 			var datasetlen = datasets[0].data.length;
	// 			for (var i = 0; i < datasetlen; i++) {
	// 				var elm = datasets[0]['data'][i];
	// 				labels.push(elm.x);
	// 			}
	// 		}
	// 	}
	//
	// 	if (yTypeIsTime == true || yTypeIsDate == true || yTypeIsDateTime == true) {
	// 		scales.yAxes[0].ticks = { display: true, maxTicksLimit: 9 };
	// 		scales.yAxes[0].gridLines = { display : true };
	// 		scales.yAxes[0].type = 'time';
	// 		scales.yAxes[0].time = { unit: 'day', displayFormats: { day: ((yTypeIsDate == true) ? ydisplayDateFormat : displayTimeFormat) }};
	//
	// 		if (yTypeIsTime == true) {
	// 			scales.yAxes[0].time = {
	// 				parser: displayTimeFormat,
	// 				unit: 'hour',
	// 				stepSize: 1,
	// 				displayFormats: {
	// 					hour: 'HH:mm'
	// 				},
	// 				tooltipFormat: displayTimeFormat
	// 			};
	// 		}
	// 	}
	// } else
	if(type=='line' || type=='scatter')  {
		var xTooltips = {};
		if (xIsDate) {
			if (datasetlabels.length > 0 && datasets.length >= 2) {
				// Hide tooltip for multiple datasets as this is showing wrong values in tooltip
				var xTooltips = {
					enabled: false,
				};
			} else {
				var xTooltips = { callbacks: {
						intersect: false,
						title: function(t, d) {
							return moment(d.labels[t[0].index]).format(xdisplayDateFormat);
						}
					}};
			}
		} else if (xTypeIsCategory) {
			scales.xAxes[0].type = 'category';
		} else {
			scales.xAxes[0].type = 'linear';
		}
		if (yIsDate) {
			if (datasetlabels.length > 0 && datasets.length >= 2) {
				// Hide tooltip for multiple datasets as this is showing wrong values in tooltip
				var xTooltips = {
					enabled: false,
				};
			} else {
				var xTooltips = {
					callbacks: {
						title: function (t, d) {
							return moment(d.labels[t[0].index]).format(ydisplayDateFormat);
						}
					}
				};
			}

			scales.yAxes[0].ticks = { display: true, maxTicksLimit: 5 };
			scales.yAxes[0].gridLines = { display : true };
			scales.yAxes[0].type = 'time';
			scales.yAxes[0].time = { unit: 'day', displayFormats: { day: ydisplayDateFormat }};
		}
	}
	var plugins = { labels: false };
	if (type == 'pie' || type == 'donut') {
		scales = { };
		plugins = { labels: { render: 'percentage', precision: 1, fontColor: '#fff', shadowColor: 'rgba(0,0,0,0.75)', textShadow: true, shadowOffsetX: -1, shadowOffsetX: -1 } };
	}
	// Set bar chart orientation
	if (typeof labels == 'undefined') labels = null;
	if (typeof orientation == 'undefined') orientation = 'vertical';
	if (type == 'bar' && orientation == 'horizontal') type = 'horizontalBar';
	// Render the chart
	var legendDisplay = (type == 'pie' || type == 'donut' || (datasetlabels.length > 0 && datasets.length > 2)
					 // Only display the legend for bar/scatter/line if we're using a grouping field
					 || ((type == 'scatter' || type == 'line' || type == 'bar' || type == 'horizontalBar') & datasetlabels.length > 0 && datasets.length >= 2));
	var options = { responsive: true, legend: { display: legendDisplay }, scales: scales, animation: { duration: 0 }, plugins: plugins };
	if (type == 'scatter' || type == 'line') {
		options.tooltips = xTooltips;
	}
	if (type == 'donut') type = 'doughnut';
	var myChart = new Chart(document.getElementById(id).getContext('2d'), {
		type: type,
		data: { labels: labels, datasets: datasets },
		options: options
	});
	// Set white bg color
	document.getElementById(id).style.backgroundColor = '#FFFFFF';
}

// Enable/disable colorblind feature of Pie/Donut Charts
function toggleChartColorBlind() {
	var enableIt = (typeof redcap_colorblind != 'undefined' && redcap_colorblind == '1') ? '0' : '1';
	showProgress(1);
	// Get URL to call
	if (page == 'surveys/index.php') {
		var url = dirname(app_path_webroot.substring(0,app_path_webroot.length-1))+'/surveys/index.php?__dashboard='+getParameterByName('__dashboard')+'&__passthru='+encodeURIComponent('ProjectDashController:colorblind');
	} else {
		var url = app_path_webroot+'index.php?pid='+pid+'&route=ProjectDashController:colorblind';
	}
	$.post(url, { enable_colorblind: enableIt }, function(data) {
		showProgress(0,0);
		if (data == '0' || data == '') {
			simpleDialog(woops);
		} else {
			window.location.reload();
		}
	});
}

// Display a Smart Chart as fullscreen in a modal dialog after being clicked
function viewSmartChartFull(ob,e) {
	// If the "toggle color-blind accessibility" link was clicked, then do not do fullscreen
	try {
		if ($(e.target).hasClass('redcap-chart-colorblind-toggle') || $(e.target).parent().hasClass('redcap-chart-colorblind-toggle')) {
			return false;
		}
	} catch (e) { }
	// Get info about chart
	var canvas = $(ob).find('canvas:first');
	var id = canvas.prop('id');
	var js = $('#js-'+id).html();
	var canvasHtml = canvas.html();
	// Replace the old id in the JS and HTML
	js = js.replace(id,id+'-fullscreen');
	dlgId = id+'-fullscreen-dlg';
	canvasHtml = '<canvas id="'+id+'-fullscreen">'+canvasHtml+'</canvas>';
	// Place the HTML in the dialog and eval it to make it appear
	simpleDialog(canvasHtml,'', dlgId, rounddown($(document).width()*0.95));
	eval(js);
	fitDialog($('#'+dlgId));
}

// Download file and append survey response_hash for File download field type on form/survey
function appendRespHash(name) {
	$('#'+name+'-link').attr('href', $('#'+name+'-link').attr('href') + '&__response_hash__='+$('#form :input[name=__response_hash__]').val());
	return true;
}

// Render Multiple Box Plots/Bar Charts (using Google Chart Tools)
function renderCharts(nextfields,charttype,results_code_hash) {
	// Do initial checking/setting of parameters
	if (nextfields.length < 1) return;
	if (isSurveyPage == null) isSurveyPage = false;
	if (charttype == null) charttype = '';
	if (results_code_hash == null || !isSurveyPage) results_code_hash = '';
	var hash = getParameterByName('s');
	var record = getParameterByName('record');
	// Do ajax request
	var url = app_path_webroot+'DataExport/plot_chart.php?pid='+pid;
	if (hash != '') {
		// Show results to survey participant (use passthru mechanism to avoid special authentication issues)
		url = dirname(dirname(app_path_webroot))+'/surveys/index.php?pid='+pid+'&s='+hash+'&__results='+getParameterByName('__results')+'&__passthru='+escape('DataExport/plot_chart.php');
	} else if (record != '') {
		// Overlay results from one record
		var event_id = getParameterByName('event_id');
		url += '&record='+record+'&event_id='+event_id;
	}
	$.post(url, { fields: nextfields, charttype: charttype, isSurveyPage: (isSurveyPage ? '1' : '0'), results_code_hash: results_code_hash, includeRecordsEvents: includeRecordsEvents, hasFilterWithNoRecords: hasFilterWithNoRecords }, function(resp_data){
		var json_data = jQuery.parseJSON(resp_data);
		// Set variables
		var field = json_data.field;
		var form = json_data.form;
		var nextfields = json_data.nextfields;
		var raw_data = json_data.data;
		var minValue = json_data.min;
		var maxValue = json_data.max;
		var medianValue = json_data.median;
		var respondentData = json_data.respondentData;
		var showChart = json_data.showChart; // Used to hide Bar Charts if lacking diversity
		if (charttype != '') {
			var plottype = charttype;
		} else {
			var plottype = json_data.plottype;
		}
		// If no data was sent OR plot should be hidden due to lack of diversity, then do not display field (would cause error)
		if (!showChart || raw_data.length == 0) {
			// Hide the field div
			if (showChart && raw_data.length == 0) {
				$('#plot-'+field).html( $('#no_show_plot_div').html() );
			} else {
				$('#plot-'+field).hide();
				$('#plot-download-btn-'+field).addClass('hideforever');
			}
			if (isSurveyPage) $('#stats-'+field).remove(); // Only hide the stats table for survey results
			$('#chart-select-'+field).hide();
			$('#refresh-link-'+field).hide();
			// Perform the next ajax request if more fields still need to be processed
			if (nextfields.length > 0) {
				renderCharts(nextfields,charttype,results_code_hash);
			}
			return;
		}
		// Show download button
		$('#plot-download-btn-'+field).show();
		// Instantiate data object
		var data = new google.visualization.DataTable();
		// Box Plot
		if (plottype == 'BoxPlot')
		{
			// Store record names and event_id's into array to allow navigation to page
			var recordEvent = new Array();
			// Set text for the pop-up tooltip
			var tooltipText = (isSurveyPage ? 'Value entered by survey participant /' : 'Click plot point to go to this record /');
			// Add data columns
			data.addColumn('number', '');
			data.addColumn('number', 'Value');
			// Add data rows
			for (var i = 0; i < raw_data.length; i++) {
				// Add to chart data
				data.addRow([{v: raw_data[i][0], f: raw_data[i][0]+'\n\n'}, {v: raw_data[i][1], f: tooltipText}]);
				// Add to recordEvent array
				if (!isSurveyPage) {
					recordEvent[i] = '&id='+raw_data[i][2]+'&event_id='+raw_data[i][3]+'&instance='+raw_data[i][4];
				}
			}
			// Add median dot
			data.addColumn('number', 'Median');
			data.addRow([{v: medianValue, f: medianValue+'\n\n'}, null, {v: 0.5, f: 'Median value /'}]);
			// Add single respondent/record data point
			if (respondentData != '') {
				var tooltipTextSingleResp1, tooltipTextSingleResp2;
				if (isSurveyPage) {
					tooltipTextSingleResp1 = tooltipTextSingleResp2 = 'YOUR value';
				} else {
					tooltipTextSingleResp1 = 'Value for selected record ('+record+')';
					tooltipTextSingleResp2 = 'Click plot point to go to this record';
				}
				data.addColumn('number', tooltipTextSingleResp1);
				data.addRow([{v: respondentData*1, f: respondentData+'\n\n'}, null, null, {v: 0.5, f: tooltipTextSingleResp2+' /'}]);
				// Add to recordEvent array
				if (!isSurveyPage) {
					recordEvent[i+1] = '&id='+record+'&event_id='+event_id;
				}
			}
			// Display box plot
			var chart = new google.visualization.ScatterChart(document.getElementById('plot-'+field));
			var chartHeight = 250;
			chart.draw(data, {chartArea: {top: 10, left: 30, height: (chartHeight-50)}, width: 650, height: chartHeight, legend: 'none', vAxis: {minValue: 0, maxValue: 1, textStyle: {fontSize: 1} }, hAxis: {minValue: minValue, maxValue: maxValue} });
			// Set action to open form in new tab when select a plot point
			if (!isSurveyPage) {
				google.visualization.events.addListener(chart, 'select', function selectPlotPoint(){
					var selection = chart.getSelection();
					if (selection.length < 1) return;
					var message = '';
					for (var i = 0; i < selection.length; i++) {
						var itemrow = selection[i].row;
						if (itemrow != null && recordEvent[itemrow] != null) {
							window.open(app_path_webroot+'DataEntry/index.php?pid='+pid+'&page='+form+recordEvent[itemrow]+'&fldfocus='+field+'#'+field+'-tr','_blank');
							return;
						}
					}
				});
			}
		}
		// Bar/Pie Chart
		else
		{
			// Add data columns
			data.addColumn('string', '');
			if (isSurveyPage) {
				data.addColumn('number', 'Count from other respondents');
				data.addColumn('number', 'Count from YOU');
			} else {
				data.addColumn('number', 'Count');
				data.addColumn('number', 'Count from the selected record');
			}
			// Add data rows
			data.addRows(raw_data);
			// Display bar chart or pie chart
			if (plottype == 'PieChart') {
				var chart = new google.visualization.PieChart(document.getElementById('plot-'+field));
				var chartHeight = 300;
				chart.draw(data, {chartArea: {top: 10, height: (chartHeight-50)}, width: 600, height: chartHeight, legend: 'none', hAxis: {minValue: minValue, maxValue: maxValue} });
			} else if (plottype == 'BarChart') {
				var chart = new google.visualization.BarChart(document.getElementById('plot-'+field));
				var chartHeight = 80+(raw_data.length*60);
				chart.draw(data, {colors:['#3366CC','#FF9900'], isStacked: true, chartArea: {top: 10, height: (chartHeight-50)}, width: 600, height: chartHeight, legend: 'none', hAxis: {minValue: minValue, maxValue: maxValue} });
			}
		}
		// Perform the next ajax request if more fields still need to be processed
		if (nextfields.length > 0) {
			renderCharts(nextfields,charttype,results_code_hash);
		}
	});
}

// Show spinner icon as plot spaceholder (using Google Chart Tools)
function showSpinner(field) {
	var currentDivHeight = $('#plot-'+field).height();
	$('#plot-'+field).html('<div style="text-align:center;width:500px;height:'+currentDivHeight+'px;"><img title="Loading..." alt="Loading..." src="'+app_path_images+'progress.gif"></div>');
}

// Fix descriptive text images for mobile devices
function fitImg(ob) {
	if (!isMobileDevice) return;
	ob = $(ob);
	if (ob.attr('nativedim') == '1') return;
	var whratio= ob.parent().width()/ob.width();
	if (whratio > 1) {
		ob.css({'width':rounddown(ob.width()*whratio)+'px','max-width':rounddown(ob.width()*whratio)+'px',
			'height':rounddown(ob.height()*whratio)+'px','max-height':rounddown(ob.height()*whratio)+'px'});
	}
}

// Get today's date in various formats
function getCurrentDate(valType,returnUTC) {
	if (typeof returnUTC == 'undefined') returnUTC = false;
	var d = new Date();
	if (returnUTC) {
		d.toUTCString();
		d = new Date( d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() );
	}
	var month = d.getMonth() + 1;
	if (month < 10) month = "0" + month;
	var day = d.getDate();
	if (day < 10) day = "0" + day;
	var year = d.getFullYear();
	if (/_mdy/.test(valType)) {
		return month+'-'+day+'-'+year;
	} else if (/_dmy/.test(valType)) {
		return day+'-'+month+'-'+year;
	} else {
		return year+'-'+month+'-'+day;
	}
}

// Enable fixed table headers for event grid
var rcDataTable;
function enableFixedTableHdrs(table_id,ordering,searching,searchDom,headerOffset,initCompleteJS,forcePreventFloatingHdrs) {
	var num_cols = $('#'+table_id+' th').length;
	if (!$('#'+table_id).length || !num_cols) return;
	// Set params
	if (typeof initCompleteJS == "undefined") initCompleteJS = "";
	if (typeof ordering == "undefined") ordering = false;
	if (typeof searching == "undefined") searching = false;
	if (typeof searchDom == "undefined") searchDom = false;
	if (typeof headerOffset == "undefined") headerOffset = 0;
	if (typeof forcePreventFloatingHdrs == "undefined") forcePreventFloatingHdrs = false;
	// Check height and width of table to see if we should even try to enable floating
	var window_width = $(window).width();
	var table_width  = $('#'+table_id).width();
	var window_height = $(window).height();
	var table_height  = $('#'+table_id).height();
	floatFirstCol = (table_width > window_width*0.9);
	floatFirstRow = (table_height > window_height*0.9);
	// If table is too big, then don't perform fixed header or column
	var IEfudge = isIE ? (IEv < 10 ? 3 : 2) : 1; // Set fudge factor for IE, which is weak
	if (floatFirstRow && num_cols > (3000/IEfudge)) {
		floatFirstRow = false;
	}
	if (floatFirstCol && (num_cols > (2000/IEfudge) || (num_cols > (500/IEfudge) && num_cols*$('#'+table_id+' tr').length > (200000/IEfudge)))) {
		floatFirstCol = false;
	}
	if (forcePreventFloatingHdrs) {
		floatFirstRow = floatFirstCol = false;
	}
	// Try to destroy data table object if already exists
	var forceDataTable = false;
	try {
		rcDataTable.destroy();
		forceDataTable = true;
	} catch(e) { }
	// Get original table position (prior to enabling DataTables)
	var table_pos = $('#'+table_id).position();
	// If this DataTable is disabled, then set params to false
	if (DataTableDisabled(table_id)) {
		forceDataTable = floatFirstCol = floatFirstRow = false;
		// Display link to reenable DataTable
		renderDisableDTlink(table_pos.top, table_id, 1, searching, searchDom);
	}
	// If nothing to do, then leave
	if (!forceDataTable && !floatFirstCol && !floatFirstRow && !searching && !ordering) return;
	// Set table params
	var dataTableParams = {
		"autoWidth": false,
		"processing": true,
		"paging": false,
		"info": false,
		"aaSorting": [],
		"fixedHeader": { header: floatFirstRow, footer: false, headerOffset: headerOffset },
		// Configurable
		"searching": searching,
		"ordering": ordering
	};
	if (searching) {
		// Set search label to ""
		$.extend(dataTableParams, {
			"oLanguage": { "sSearch": "" }
		});
	}
	if (floatFirstCol) {
		$.extend(dataTableParams, {
			"fixedColumns": true,
			scrollY: (floatFirstRow ? round(window_height*0.7) : table_height)+"px",
			scrollX: true
		});
	}
	if (initCompleteJS != "") {
		$.extend(dataTableParams, {
			"initComplete": function(settings, json) {
				eval(initCompleteJS);
			}
		});
	}
	try {
		// Enable the data table
		rcDataTable = $('#'+table_id).DataTable(dataTableParams);
		// Set width of scrollable area if we're fixing the first column
		if (floatFirstCol) {
			$('.dataTables_scroll').width( window_width-($('#west').length ? $('#west').width() : 0)-50 );
		}
		// DataTables prevents Backspace key from being used in search, so change type to "text"
		if (searching) {
			$('#'+table_id+'_filter.dataTables_filter input[type="search"]').css({'background-color':'#fff','border':'1px solid #aaa'}).attr('type','text').prop('placeholder','Search');
			if (searchDom && $(searchDom).length) {
				$(searchDom).append('<div class="row mt-1 dataTables-rc-searchfilter-parent"><div class="col-sm-6"></div><div class="col-sm-6"><div class="dataTables_filter-parent"></div></div></div>');
				$(searchDom+' .dataTables_filter-parent').append( $('.dataTables_filter:first').detach() );
			} else if (searchDom && !$(searchDom).length && ($(window).width() > (800+$('#west').width())) && $('#'+table_id).width() < 800) {
				// Prevent search box from being placed too far to right when table is narrow
				$('div.dataTables_filter:first').css({'float': 'left', 'margin-left': '550px' });
			}
			// Deal with footer position when typing in search
			$('#'+table_id+'_filter.dataTables_filter input[type="text"]').keyup(function(){
				try { setProjectFooterPosition(); } catch (e) { }
			});
		}
		// If this is a multipage report, then display message about sorting by header
		if (ordering && $('.report_sort_msg').length && $('.report_page_select option:selected').val() != 'ALL') {
			$('table.dataTable thead th').click(function(){
				$('.report_sort_msg:first').show();
			});
		}
		// Render link to disable/reenable DataTable
		if (floatFirstCol || floatFirstRow) renderDisableDTlink(table_pos.top, table_id, ((floatFirstCol || floatFirstRow) ? 0 : 1), searching, searchDom);
	} catch(e) {
		// Restripe table rows if failed (in case they didn't get added)
		if ($('#'+table_id).hasClass('dataTable')) {
			$('#'+table_id+' tbody tr').removeClass('even').removeClass('odd');
			$('#'+table_id+' tbody tr:odd').addClass('even');
			$('#'+table_id+' tbody tr:even').addClass('odd');
		}
	}
}

// Render link to disable/re-enable DataTable
function renderDisableDTlink(table_pos_top, table_id, disable, hasSearchInput, searchDom) {
	// Set params
	var linkText = (disable == '0') ? 'Table not displaying properly' : 'Re-enable floating table headers';
	var html = '<span id="FixedTableHdrsEnable"><a href="javascript:;" style="text-decoration:underline;" onclick="disableFixedTableHdrs(\''+table_id+'\','+disable+');return false;">'+linkText+'</a><a href="javascript:;" class="help" onclick="simpleDialog(\'On certain occasions, the table on this page might not display properly but might have its columns or rows appear misaligned in some way, thus making it difficult to view the table or navigate it well. If you click the &quot;Table not displaying properly&quot; link, it will disable the floating headers for the table, causing it to be displayed in a more viewable format.\',\'Is the table not displaying properly?\');">?</a></span>';
	// Do not display the "fix table" link for public reports (only works for logged-in users)
	if (page == 'surveys/index.php' && getParameterByName('__report') != '') html = '';
	// Create new link on the page
	if (searchDom) {
		setTimeout(function(){
			$('#'+table_id+'_filter.dataTables_filter').append(html);
			$('#FixedTableHdrsEnable').show().css({'position': 'relative'});
		},100);
	} else {
		// Position the link
		$('body').append(html);
		var span_pos_top  = (table_pos_top-$('#FixedTableHdrsEnable').outerHeight(true)-25);
		var span_pos_left = ($(window).width()-$('#FixedTableHdrsEnable').outerWidth(true)-35);
		// Display the link
		$('#FixedTableHdrsEnable').show().css({'top': span_pos_top+'px', 'left': span_pos_left+'px'});
	}
}

// Disable fixed header/column on a table
function disableFixedTableHdrs(table_id, disableDT) {
	$.post(app_path_webroot+'index.php?pid='+pid+'&route=DataEntryController:saveShowInstrumentsToggle',{ object: 'datatables_disable', targetid: table_id, collapse: disableDT },function(data){
		if (data == '0') { alert(woops);return; }
		showProgress(1);
		window.location.reload();
	});
}

// Check if a DataTable has been hidden in the current project
function DataTableDisabled(table_id) {
	try {
		if (typeof datatables_disable[table_id] != "undefined") {
			return (datatables_disable[table_id] == '1');
		}
		return false;
	} catch(e) {
		return false;
	}
}

// Get URL for appending live filters to report AJAX URL (obtain from drop-downs)
function getLiveFilterUrl() {
	var dynamicFiltersUrl = '';
	var this_dyn_filter;
	if (max_live_filters == null) max_live_filters = 3;
	for (var i=1; i<=max_live_filters; i++) {
		this_dyn_filter = $('#lf'+i);
		if (this_dyn_filter.length && this_dyn_filter.val() != '') {
			dynamicFiltersUrl += '&lf'+i+'='+this_dyn_filter.val();
		}
	}
	return dynamicFiltersUrl;
}

// Function to reformat Time from military time to am/pm format
function format_time(time)
{
	time = time.split(':'); // convert to array
	// fetch
	var hours = Number(time[0]);
	var minutes = Number(time[1]);
	// calculate
	var timeValue;
	if (hours > 0 && hours <= 12) {
		timeValue= "" + hours;
	} else if (hours > 12) {
		timeValue= "" + (hours - 12);
	} else if (hours == 0) {
		timeValue= "12";
	}
	timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;
	timeValue += (hours >= 12) ? "pm" : "am";
	return timeValue;
}

// Increment field values for fields with @DOWNLOAD-COUNT action tag
function incrementDownloadCount(fieldsCsv, ob2)
{
	if (fieldsCsv == '') return;
	var fields = fieldsCsv.split(',');
	var fld, val, ob, newval, index, doBranchingCalcs;
	for (var i=0; i<fields.length; i++) {
		fld = fields[i];
		doBranchingCalcs = false; // default
		// Data entry forms and survey pages
		if (page == 'DataEntry/index.php' || (page == 'surveys/index.php' && getParameterByName('__report') == '')) {
			ob = $(':input[name="' + fld + '"]');
			if (ob.length) {
				val = ob.val();
				newval = (isnumber(val) && isinteger(val * 1)) ? (val * 1 + 1) : 1;
				ob.val(newval);
				doBranchingCalcs = true;
			}
		}
		// Report pages
		else if (page == 'DataExport/index.php' || (page == 'surveys/index.php' && getParameterByName('__report') != '')) {
			$(ob2).parentsUntil('tr').parent().find('.download-count-' + fld).each(function(){
				val = $(this).text();
				newval = (isnumber(val) && isinteger(val * 1)) ? (val * 1 + 1) : 1;
				$(this).html(newval);
				doBranchingCalcs = true;
			});
		}
		// Run calcs/branching logic for this field, if changed
		if (doBranchingCalcs) {
			try {
				calculate(fld);
				doBranching(fld);
			} catch(e) { }
		}
	}
}

// Get date format by date type to display chart
function getDateDisplayFormat(dateType) {
	var displayDateFormat = 'YYYY-MM-DD';
	switch (dateType) {
		case "date_dmy":
			displayDateFormat = 'DD-MM-YYYY';
			break;
		case "date_mdy":
			displayDateFormat = 'MM-DD-YYYY';
			break;
		case "date_ymd":
			displayDateFormat = 'YYYY-MM-DD';
			break;
		case "datetime_dmy":
			displayDateFormat = 'DD-MM-YYYY h:mm';
			break;
		case "datetime_mdy":
			displayDateFormat = 'MM-DD-YYYY h:mm';
			break;
		case "datetime_ymd":
			displayDateFormat = 'YYYY-MM-DD h:mm';
			break;
		case "datetime_seconds_dmy":
			displayDateFormat = 'DD-MM-YYYY h:mm:ss';
			break;
		case "datetime_seconds_mdy":
			displayDateFormat = 'MM-DD-YYYY h:mm:ss';
			break;
		case "datetime_seconds_ymd":
			displayDateFormat = 'YYYY-MM-DD h:mm:ss';
			break;
	}
	return displayDateFormat;
}

const DUO_STRATEGY_AUTO = 'auto';
const DUO_STRATEGY_POPUP = 'popup';
const DUO_STRATEGY_REDIRECT = 'redirect';
const DUO_STRATEGY_PARAM = 'duo_strategy';
const DUO_DEBUG_PREFIX = '[DUO]';
const DUO_VERIFICATION_SUCCESS_MESSAGE_TYPE = 'duo_verification_success';
const DUO_ESIGN_SUCCESS_MESSAGE_TYPE = 'duo_esign_success';
const DUO_POPUP_ERROR_MESSAGE_TYPE = 'duo_popup_error';
const DUO_STRATEGY_REASON_DEFAULT_AUTO = 'default_auto';
const DUO_STRATEGY_REASON_QUERY_PARAM = 'query_param';
const DUO_STRATEGY_REASON_GLOBAL = 'global_override';
const DUO_STRATEGY_REASON_INVALID = 'invalid_override';
const DUO_STRATEGY_REASON_VERIFICATION_FORCED = 'verification_popup_forced';

/**
 * Normalize a Duo launch strategy string to a supported value.
 */
function normalizeDuoStrategy(strategy) {
	if (typeof strategy !== 'string') return null;
	var normalized = strategy.toLowerCase();
	if (normalized === DUO_STRATEGY_POPUP || normalized === DUO_STRATEGY_REDIRECT || normalized === DUO_STRATEGY_AUTO) {
		return normalized;
	}
	return null;
}

/**
 * Resolve the Duo launch strategy for login flows.
 */
function resolveDuoLaunchStrategy() {
	var reason = DUO_STRATEGY_REASON_DEFAULT_AUTO;
	var requested = null;

	var queryOverride = getParameterByName(DUO_STRATEGY_PARAM);
	if (queryOverride) {
		requested = queryOverride;
		reason = DUO_STRATEGY_REASON_QUERY_PARAM;
	} else if (typeof window.DUO_LAUNCH_STRATEGY === 'string' && window.DUO_LAUNCH_STRATEGY !== '') {
		requested = window.DUO_LAUNCH_STRATEGY;
		reason = DUO_STRATEGY_REASON_GLOBAL;
	}

	var strategy = normalizeDuoStrategy(requested);
	if (!strategy) {
		if (requested) {
			reason = DUO_STRATEGY_REASON_INVALID;
		}
		strategy = DUO_STRATEGY_AUTO;
	}

	window.DUO_LAST_STRATEGY = strategy;
	window.DUO_LAST_REASON = reason;
	if (window.DUO_DEBUG) {
		console.log(DUO_DEBUG_PREFIX, 'Strategy resolved', {
			strategy: strategy,
			reason: reason,
			requested: requested
		});
	}
	return strategy;
}

/**
 * Return the handler registry used for the current Duo verification flow.
 */
function getDuoVerificationHandlers() {
	if (!window.duoVerificationHandlers || typeof window.duoVerificationHandlers !== 'object') {
		window.duoVerificationHandlers = {};
	}
	return window.duoVerificationHandlers;
}

/**
 * Execute Duo callback hooks for the active verification flow.
 */
function invokeDuoVerificationHandler(action, payload) {
	var callbackPayload = payload || {};
	var handlers = getDuoVerificationHandlers();
	var handler = handlers[action];
	if (handler) {
		handler(callbackPayload);
		return true;
	}
	return false;
}

/**
 * Stop monitoring the Duo popup window if a monitor is active.
 */
function clearDuoVerificationPopupMonitor() {
	if (window.duoVerificationPopupMonitor) {
		window.clearInterval(window.duoVerificationPopupMonitor);
		window.duoVerificationPopupMonitor = null;
	}
}

/**
 * Mark the active Duo verification attempt as resolved.
 */
function markDuoVerificationResolved() {
	window.duoVerificationResolved = true;
	clearDuoVerificationPopupMonitor();
}

/**
 * Manually trigger Duo cancellation/error handling.
 */
function triggerDuoVerificationError() {
	markDuoVerificationResolved();
	invokeDuoVerificationHandler('error', { reason: 'manual_cancel' });
}

// Send code via email or sms
function sendTFAcode(type,sendblind,esign) {
	if (typeof sendblind == 'undefined') sendblind = false;
	if (typeof esign == 'undefined') esign = 0;
	$('#two_factor_option_progress_'+type).show();
	$('input[name="two_factor_option"][value="'+type+'"]').prop('checked', true);
	// Duo uses a different flow (launch prompt)
	if (type == 'duo') {
		window.DUO_LAST_STRATEGY = DUO_STRATEGY_POPUP;
		window.DUO_LAST_REASON = DUO_STRATEGY_REASON_VERIFICATION_FORCED;
		invokeDuoVerificationHandler('start');
		// Reset any prior state so we don't reuse a stale verification.
		window.duoVerificationResolved = false;
		clearDuoVerificationPopupMonitor();
		window.duoVerificationState = null;
		var popupWidth = 480;
		var popupHeight = 720;
		var popupLeft = Math.max(0, Math.round((window.screen.width - popupWidth) / 2));
		var popupTop = Math.max(0, Math.round((window.screen.height - popupHeight) / 2));
		var popupFeatures = 'width=' + popupWidth + ',height=' + popupHeight + ',left=' + popupLeft + ',top=' + popupTop;
		var duoWindow = window.open('about:blank', 'duo_esign', popupFeatures);
		if (!duoWindow) {
			simpleDialog(woops);
			markDuoVerificationResolved();
			invokeDuoVerificationHandler('error', { reason: 'popup_blocked' });
			return;
		}
		window.duoVerificationPopupMonitor = window.setInterval(function() {
			if (duoWindow.closed) {
				clearDuoVerificationPopupMonitor();
				if (!window.duoVerificationResolved) {
					markDuoVerificationResolved();
					invokeDuoVerificationHandler('error', { reason: 'popup_closed' });
				}
			}
		}, 400);
		$.ajax({
			url: app_path_webroot+'Authentication/two_factor_send_code.php',
			type: 'POST',
			dataType: 'json',
			data: { type: type, esign: esign },
			success: function(response) {
				if (response && response.url) {
						window.duoVerificationState = response.state || null;
						duoWindow.location = response.url;
					} else {
						simpleDialog(woops);
						markDuoVerificationResolved();
						invokeDuoVerificationHandler('error', { reason: 'empty_response' });
					}
				},
				error: function() {
					simpleDialog(woops);
					markDuoVerificationResolved();
					invokeDuoVerificationHandler('error', { reason: 'request_error' });
				}
			});
			return;
		}
	// Ajax request
	$.post(app_path_webroot+'Authentication/two_factor_send_code.php', { type: type, esign: esign }, function(data) {
		if (isNumeric(data) && data > 0) {
			// If we're sending blind, then do nothing if successfully sent
			if (sendblind) return;
			// Code was successfully sent
			setTimeout(function(){
				$('#two_factor_option_progress_'+type).hide();
				$('#two_factor_option_success_'+type).show();
				setTimeout(function(){
					$('#two_factor_option_success_'+type).hide('fade');
				},3000);
			},700);
			// SMS or Voice Call only: Set constant checking of tf_id to see if it's verified (i.e., if user has responded to SMS or call)
			if (type == 'sms' || type == 'voice') {
				current_tf_id = data;
				check_login_status(current_tf_id);
			}
		} else {
			// If we're sending blind, then display woops message upon failure
			if (sendblind) {
				simpleDialog(woops);
				return;
			}
			$('#two_factor_option_progress_'+type).hide();
			$('#two_factor_option_fail_'+type).show();
			setTimeout(function(){
				$('#two_factor_option_fail_'+type).hide('fade');
				$('#tf_verify_step').dialog('close');
			},5000);
			// If returning a text error msg, display it to user
			if (data != '' && !isNumeric(data)) {
				simpleDialog(data);
			}
		}
	});
}

// Listen for Duo popup success and route to active handlers.
window.addEventListener('message', function(event) {
	try {
		if (event.origin !== window.location.origin) return;
	} catch (e) {
		return;
	}
	var messageType = event && event.data ? event.data.type : null;
	if (messageType === DUO_VERIFICATION_SUCCESS_MESSAGE_TYPE || messageType === DUO_ESIGN_SUCCESS_MESSAGE_TYPE) {
		markDuoVerificationResolved();
		var handled = invokeDuoVerificationHandler('success', {
			state: window.duoVerificationState || null,
			messageType: messageType
		});
		if (!handled) {
			showToast('Duo', 'Verification complete. You may continue.', 'success', 4000);
		}
		return;
	}
	if (messageType === DUO_POPUP_ERROR_MESSAGE_TYPE) {
		markDuoVerificationResolved();
		var handledError = invokeDuoVerificationHandler('error', {
			reason: 'duo_declined',
			messageType: messageType
		});
		if (!handledError) {
			simpleDialog(woops);
		}
	}
});

// Display Bootstrap toast
function showToast(title, content, type, delay)
{
	// Init vars
	var obId = "rc-toast-"+Math.floor(Math.random()*10000000000000000);
	if (typeof type == 'undefined') type = 'success';
	if (typeof content == 'undefined') content = null;
	if (typeof delay == 'undefined' || !isinteger(delay)) delay = 3000;
	var bg, fg = 'text-white';
	let autohide = true;
	switch (type) {
		case 'info':
			bg = 'bg-info';
			break;
		case 'warning':
			bg = 'bg-warning';
			break;
		case 'error':
			bg = 'bg-danger';
			autohide = false;
			break;
		case 'success':
			bg = 'bg-success';
			break;
		case 'dark':
			bg = 'bg-dark';
			break;
		case 'light':
			bg = 'bg-light';
			fg = 'text-black'
			break;
		case 'success':
		default:
			bg = 'bg-success';
			break;
	}
	// Init container
	var container = 'rc-toast-container';
	var $container = $('#'+container);
	if (!$container.length) {
		$container = $('<div id="'+container+'" class="toast-container position-fixed bottom-0 end-0 p-5" style="z-index: 99999; right: 0; bottom: 0;"></div>').appendTo('body');
	}
	// Build toast
	var html = '';
	html += '<div id="'+obId+'" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true">';
	html += '	<div class="toast-header '+bg+' '+fg+'">';
	html += '		<strong class="mr-auto">'+title+'</strong>';
	html += '		<button type="button" class="'+fg+' ms-2 mb-1 close" data-bs-dismiss="toast" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
	html += '	</div>';
	if (content) {
		html += '<div class="toast-body">'+content+'</div>';
	}
	html += '</div>';
	// Add toast to DOM and display it
	$container.append(html);
	var $toast = $container.find('#'+obId).toast({
		autohide: autohide,
		delay: delay,
		animation: true
	});
	$toast.toast('show')
	.on('hidden.bs.toast', function() { 
		$toast.toast('dispose'); 
		$container.find('#'+obId).remove();
	});
	// Return id
	return obId;
}

/**
 * Copies a string to the clipboard (fallback method for older browsers)
 * @param {string} text
 */
function fallbackCopyTextToClipboard(text) {
	var textArea = document.createElement("textarea");
	textArea.value = text;
	// Avoid scrolling to bottom
	textArea.style.top = "0";
	textArea.style.left = "0";
	textArea.style.position = "fixed";
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	try {
		document.execCommand('copy');
	} catch(e) {
		error('Failed to copy text to clipboard.')
	}
	document.body.removeChild(textArea);
}

/**
 * Copies a string to the clipboard (supported in modern browsers)
 * @param {string} text
 * @returns
 */
function copyTextToClipboard(text) {
	if (!navigator.clipboard) {
		fallbackCopyTextToClipboard(text);
		return;
	}
	navigator.clipboard.writeText(text).catch(function() {
		console.error('Failed to copy text to clipboard.')
	});
}

/**
 * Adds the class "success-indicator" to the given element and then removes it after the given duration (in milliseconds; default: 250)
 * @param {HTMLElement} el 
 * @param {number} duration
 */
function indicateSuccess(el, duration = 250) {
	var $el = $(el);
	$el.addClass('success-indicator');
	setTimeout(function() {
		$el.removeClass('success-indicator');
	}, 500);
}

// Return boolean if filename is allowed based on Restricted Upload File Types setting
var restricted_upload_file_types = []; // This will mostly be overridden on webpage by PHP
function fileTypeAllowed(filename)
{
	var ext = getfileextension(filename);
	return !in_array(ext.toLowerCase(), restricted_upload_file_types);
}

// Redefine Math.pow to deal with negatives better for fractional exponents in calculations - e.g. (-8)^(1/3) would normally return '2'
Math.pow_ = Math.pow; //keep the original method for proxying
Math.pow = function(_base, _exponent) {
	if (_base < 0) {
		if (Math.abs(_exponent) < 1) {
			//we're calculating nth root of _base, where n === 1/_exponent
			if ((1 / _exponent) % 2 === 0) {
				//nth root of a negative number is imaginary when n is even, we could return
				//a string like "123i" but this would completely mess up further computation
				return NaN;
			}/*else if (1 / _exponent % 2 !== 0)*/
			//nth root of a negative number when n is odd
			return -Math.pow_(Math.abs(_base), _exponent);
		}
	}/*else if (_base >=0)*/
	//run the original method, nothing will go wrong
	return Math.pow_(_base, _exponent);
};

// Display page-caching info on the page
var justStoredPageInCache = false;
function displayPageCacheInfo(cache_time)
{
	if (typeof cache_time == 'undefined') cache_time = 'unknown';
	if ($('#cache-notice').length) $('#cache-notice').remove();
	if (justStoredPageInCache) return;
	$(function(){
		var link = '<div id="cache-notice" class="float-right font-weight-normal mt-1 ms-5 ps-5 d-print-none">'
				 + '<a href="javascript:;" class="text-secondary fs11 opacity65"><i class="fa-solid fa-rocket"></i> '+lang.system_config_873+'</a>'
				 + '</div>';
		if ($('#subheaderDiv2').length) {
			// Record status dashboard and reports
			$('#subheaderDiv2').append(link);
		} else if ($('.report-results-returned').length) {
			// Public reports
			$('.report-results-returned:first').after(link);
		}
		$('#cache-notice a').click(function(){
			simpleDialog(lang.system_config_874+' <b>'+cache_time+'</b>'+lang.period,'<i class="fa-solid fa-rocket"></i> '+lang.system_config_873);
		});
	});
}

// ****************************************************************************************************
// Variables to be set upon page load
// ****************************************************************************************************
var pid='', cookie_samesite='', cookie_secure='';
// Standard error message
var woops = "Woops! An error occurred. Please try again.";
// Determine if using Internet Explorer
var agt = navigator.userAgent.toLowerCase();
var isIE = (agt.indexOf('msie') > -1 || agt.indexOf('trident') > -1);
// Returns IE version
var IEv = vIE();
// Determine if using iOS
var isIpad = ((navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0) || navigator.platform === 'iPad');
var isIOS = (isIpad || /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
var iOSv = iOSversion();
// Determine if using Android
var isAndroid = /Android/.test(agt);
// Set width as max width for phone/tablet
var maxMobileWidth = 767;
// Determine if we're on a global page or a project-level page (check for pid or pnid)
var isProjectPage = (getParameterByName('pid') != "" || getParameterByName('pnid') != "");
// Set original value to show the branching logic prompt "Erase Value" on forms when it attempts to hide a field with a value due to branching logic
var showEraseValuePrompt = 1;
// Set flag to detect if data entry form values have been modified
var dataEntryFormValuesChanged = false;
var dataEntryFormValuesChangedNeverTrack = false;
// Set placeholder for randomization criteria field list (if using randomization module)
var randomizationCriteriaFieldList = null;
// Track what was just clicked
var object_clicked = null;
var tab_pressed = false;
// Set initial value
var isMobileDevice = false;
// Init the missing data codes array
var missing_data_codes = new Array();
// Remove __redcap_post_redirect from the URL, if detected
if (getParameterByName('__redcap_post_redirect') != '') {
	modifyURL(removeParameterFromURL(window.location.href, '__redcap_post_redirect'));
}
// MyCap related var
var removeMyCapEMLink = 0;
// Functions to run after page is fully loaded
$(function(){
	// These two lines resolve a jQuery UI conflict with Bootstrap 5
	var bootstrapButton = $.fn.button.noConflict() // return $.fn.button to previously assigned value
	$.fn.bootstrapBtn = bootstrapButton            // give $().bootstrapBtn the Bootstrap functionality
	// Based in screen width, is this a mobile device (phone)?
	isMobileDevice = isMobileDeviceFunc();
	// Initialize widgets, buttons, etc. on page
	initWidgets();
	// Initialize the project-level page
	if (isProjectPage) {
		try { initPage(); }catch(e){ }
	} else {
		initPageGlobal();
	}
	// Hide left-hand project menu icons from screen readers for compatibility reasons (set timeout to let other JS clear first)
	setTimeout(function(){
		if (isProjectPage) {
			$('#west img').each(function(){ if (!$(this).attr('alt')) $(this).attr('aria-hidden', 'true'); });
			$('#west .fas, #west .far, #west img[alt=""]').attr('aria-hidden', 'true').removeAttr('alt');
		} else if (page != 'surveys/index.php') {
			$('#control_center_menu img').each(function(){ if (!$(this).attr('alt')) $(this).attr('aria-hidden', 'true'); });
			$('#control_center_menu .fas, #control_center_menu .far, #control_center_menu img[alt=""]').attr('aria-hidden', 'true').removeAttr('alt');
		}
	}, 10);
    // Rewrite jQuery $.post and $.ajax functions to automatically send CSRF token for all Post requests (do not do this for Plugins)
    if (window.redcap_csrf_token) {
        $.post = function (url, data, success) {
            if (typeof data == 'string') {
                data += "&redcap_csrf_token="+redcap_csrf_token;
            } else {
                $.extend(data, {redcap_csrf_token: redcap_csrf_token});
            }
            return $.ajax({type: "POST", url: url, data: data, success: success});
        }
        $.ajaxPrefilter(function(options) {
            var json = ($.inArray('json', options.dataTypes) === -1);
            if (options.type == 'POST' && !json ) {
                if (typeof options.data == 'string') {
                    options.data += "&redcap_csrf_token=" + redcap_csrf_token;
                } else {
                    $.extend(options.data, {redcap_csrf_token: redcap_csrf_token});
                }
            }
        });
    }
	// Rewrite jQueryUI dialog to allow title to contain HTML
	$.widget("ui.dialog", $.extend({}, $.ui.dialog.prototype, {
		_title: function(title) {
			if (!this.options.title ) {
				title.html("&#160;");
			} else {
				title.html(this.options.title);
			}
		}
	}));
	// Bootstrap 5 dialog backward compatibility
	if ($('div.modal').length) {
		$('div.modal').each(function(){
			$(this).attr('data-bs-keyboard', $(this).data('keyboard') );
			$(this).attr('data-bs-backdrop', $(this).data('backdrop') );
			$('[data-dismiss]', this).each(function(){
				$(this).attr('data-bs-dismiss', $(this).data('dismiss') );
			});
		});
	}
	if ($('[data-toggle]').length) {
		$('[data-toggle]').each(function(){
			$(this).attr('data-bs-toggle', $(this).data('toggle') );
			if ($(this).data('parent') != null) $(this).attr('data-bs-parent', $(this).data('parent') );
			if ($(this).data('target') != null) $(this).attr('data-bs-target', $(this).data('target') );
			if ($(this).data('container') != null) $(this).attr('data-bs-container', $(this).data('container') );
			if ($(this).data('placement') != null) $(this).attr('data-bs-placement', $(this).data('placement') );
			if ($(this).data('content') != null) $(this).attr('data-bs-content', $(this).data('content') );
			if ($(this).data('backdrop') != null) $(this).attr('data-bs-backdrop', $(this).data('backdrop') );
			if ($(this).data('html') != null) $(this).attr('data-bs-html', $(this).data('html') );
			if ($(this).data('trigger') != null) $(this).attr('data-bs-trigger', $(this).data('trigger') );
		});
	}
	// If SSL is being utilized according to REDCap base URL but user is on a non-SSL page, then redirect to SSL version of same page.
	try {
		if (app_path_webroot_full.substring(0,6) == 'https:' && document.location.protocol != 'https:') {
			window.location.href = document.URL.replace(/http:/i,'https:');
		}
	} catch(e) { }
	// User "object_clicked" to determine if something was just clicked, as opposed to merely tabbing out of a text box.
    $(document).mousedown(function(e) {
        // The latest element clicked
        object_clicked = $(e.target);
		tab_pressed = false;
    });
    $(document).mouseup(function(e) {
		// When 'object_clicked == null' on blur, we know it was not caused by a click but maybe by pressing the tab key
        object_clicked = null;
    });
	$(document).keydown(function(e) {
		var keyCode = e.keyCode || e.which;
		if (keyCode == 9) { // TAB key pressed
			tab_pressed = true;
		} else {
			tab_pressed = false;
		}
	});
	// Prevent any auto-filling of text fields by browser methods
	addAutoCompleteToInputs();
	// TinyMCE 5 workaround because the Source Code editor and Insert/Edit Link modal were not editable if opened on top of a modal dialog
	// Added ui-dialog to activate jQuery dialog when opened on top of bootstrap
	// This is similar to the following recommendation from TinyMCE: https://www.tiny.cloud/blog/tinymce-and-modal-windows/
	// We used to use $(document).on instead, but it stopped working in Bootstrap 5 for the Insert/Edit Link modal
	// in rich text settings for external module configuration dialogs (e.g. Inline Descriptive Pop-ups)
	// The Inline Descriptive Pop-ups external module configuration is a good example for testing this
	var selectorTinyMceWorkaround = '.tox-tinymce-aux, .moxman-window, .tam-assetmanager-root, .sp-picker-container .sp-input, #rc-ace-editor, .select2-container :input, .ui-dialog';
	$(document).on('focusin', function(e) {
		if ($(e.target).closest(selectorTinyMceWorkaround).length) e.stopImmediatePropagation();
	});
	document.addEventListener('focusin', function(e) {
		if ($(e.target).closest(selectorTinyMceWorkaround).length) e.stopImmediatePropagation();
	});
	// Sanitize link target attribute
	sanitizeTargetBlank();
	// Initialize inline PDFs
	initInlinePdfs();
	// Hacky fix for TinyMCE bug (https://github.com/tinymce/tinymce/issues/10487)
	if ($('.ephox-dragster-blocker').length) $('.ephox-dragster-blocker').remove();
	// REDCap+ dialog
	$('.redcap-plus-badge').on('click', function() {
		showProgress(1);
		$.post(app_path_webroot+'index.php?route=REDCapPlusController:index', { }, function(data){
			showProgress(0,0);
			simpleDialog(data, lang.global_324, null, 600);
		});
		return false;
	});
});

/**
 * Interpolates a string using the given values.
 * @param {string} string The string template.
 * @param {any[] | object} values The values used for interpolation, supplied as array or object.
 * @returns {string} The interpolated string.
 */
function interpolateString(string, values) {
	if (typeof string == 'undefined' || string == null) {
		console.warn('interpolateString() called with undefined or null.')
		return ''
	}
	// Is string not a string, or empty? Then there is nothing to do.
	if (typeof string !== 'string' || string.length == 0) {
		return string
	}
	// Placeholers are in curly braces, e.g. {0}. Optionally, a type hint can be present after a colon (e.g. {0:Date}), 
	// which is ignored however. Hints must not contain any curly braces.
	// To not replace a placeholder, the first curly can be escaped with a %-sign like so: '%{1}' (this will leave '{1}' in the text).
	// To include '%' as a literal before a curly opening brace, a double-% ('%%') must be used, i.e. '%%{0}' with value x this will result in '%x'.
	// Placeholder names can be strings (a-Z0-9_), too (need associative array then). 
	// First, parse the string.
	var allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_'
	var matches = []
	var mode = 'scan'
	var escapes = 0
	var start = 0
	var key = ''
	var hint = ''
	for (var i = 0; i < string.length; i++) {
		var c = string[i]
		if (mode == 'scan' && c == '{') {
			start = i
			key = ''
			hint = ''
			if (escapes % 2 == 0) {
				mode = 'key'
			}
			else {
				mode = 'store'
			}
		}
		if (mode == 'scan' && c == '%') {
			escapes++
		}
		else if (mode == 'scan') {
			escapes = 0
		}
		if (mode == 'hint') {
			if (c == '}') {
				mode = 'store'
			}
			else {
				hint += c
			}
		}
		if (mode == 'key') {
			if (allowed.includes(c)) {
				key += c
			}
			else if (c == ':') {
				mode = 'hint'
			}
			else if (c == '}') {
				mode = 'store'
			}
		}
		if (mode == 'store') {
			var match = {
				key: key,
				hint: hint,
				escapes: escapes,
				start: start,
				end: i
			}
			matches.push(match)
			key = ''
			hint = ''
			escapes = 0
			mode = 'scan'
		}
	}
	// Then, build the result.
	var result = ''
	if (matches.length == 0) {
		result = string
	} else {
		prevEnd = 0
		for (var i = 0; i < matches.length; i++) {
			var match = matches[i]
			var len = match.start - prevEnd - (match.escapes > 0 ? Math.max(1, match.escapes - 1) : 0)
			result += string.substr(prevEnd, len)
			prevEnd = match.end 
			if (match.key != '' && typeof values[match.key] !== 'undefined') {
				result += values[match.key]
				prevEnd++
			}
		}
		result += string.substr(prevEnd)
	}
	return result
}

// Initialize an inline PDF via PdfObject+PDF.js
function initPdfObject(container_id, forcePDFJS)
{
	// if (typeof forcePDFJS == 'undefined' || forcePDFJS == '0') forcePDFJS = false;
	// else if (forcePDFJS == '1') forcePDFJS = true;
	const pdfUrl = $('#' + container_id).attr('src');
	const viewerResource = 'redcap_v' + redcap_version + '/Resources/PDFJS/web/viewer.html';
	const viewerUrl = is_survey()
		? app_path_survey_full.replace('/surveys/', '/' + viewerResource)
		: app_path_webroot_full + viewerResource;
	const options = {
		height: '100%',
		pdfOpenParams: {
			navpanes: 0,
			toolbar: 1,
			statusbar: 0,
			pagemode: "none",
			zoom: 'page-width'
		},
		PDFJS_URL: viewerUrl,
		// Disable JavaScript within the PDF
		enableScripting: false,
		// Change this to FALSE to have it be responsive to if OS/browser has a built-in PDF viewer
		forcePDFJS: true // Always enforce PDF.JS to prevent XSS injection inside PDFs
	};
	const pdf = PDFObject.embed(pdfUrl, '#'+container_id, options);
}

// Initialize inline PDFs
function initInlinePdfs()
{
	$('.inline-pdf-viewer:not(.inline-pdf-viewer-loaded):visible').each(function() {
		// Get ID of div from DOM, and if missing, add an ID to it
		var id = $(this).prop('id');
		if (id == null || id == '') {
			id = getFileId();
			$(this).prop('id', id);
		}
		// Use default PDF viewer on device except if using iOS or Android devices (because they can't support
		// multi-page inline PDFs) or if device does not have built-in PDF viewer.
		var forcePDFJS = (isAndroid || isIOS);
		initPdfObject(id, forcePDFJS);
		// Add class to denote that div was already initialized
		$('#'+id).addClass('inline-pdf-viewer-loaded');
		// Set custom CSS inside the PDF iframe
		var customFunc = function(){ customizePdfJsToolbar(id) };
		setTimeout(customFunc,200);
		$('#'+id+' iframe').on('load',customFunc);
	});
}

// Hide the editor mode buttons
function customizePdfJsToolbar(id)
{
	var css = "#editorModeButtons { display: none; }";
	$('#'+id+' iframe').contents().find("head").append("<style>"+css+"</style>");
}

// Return HTML div container for rendering an inline PDF on the page via PDFObject
function renderInlinePdfContainer(src, id)
{
	if (typeof id == 'undefined') id = getFileId();
	return "<div src='" + src + "' id='" + id + "' class='inline-pdf-viewer'></div>";
}

// Generates a pseudo-random id for a PDF object or other things
function getFileId(field) {
	var append = (typeof field == 'undefined') ? '' : '-' + field;
	return 'file-id-' + (Math.random() * 100000).toFixed(0) + append;
}

/**
 * Splits a string into an array, and optionally limits the number of items in the array.
 * Contrary to String.split, this will include the full string in the array.
 * @param {string} separator 
 * @param {int} limit 
 * @returns {string[]}
 */
String.prototype.explode = function(separator, limit) {
    var array = this.split(separator);
    if (limit !== undefined && array.length >= limit)
    {
        array.push(array.splice(limit - 1).join(separator));
    }
    return array;
};

function showCookieUsagePolicy() {
	simpleDialog(RCView.tt('global_305'), RCView.tt('global_304'),'cookie-policy', 750);
	fitDialog($('#cookie-policy'));
}

// Return boolean if a URL or filename ends with a known video file extension
function hasVideoExtension(filename) {
	// List of known video file extensions
	const videoExtensions = [
		'.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
		'.mpg', '.mpeg', '.3gp', '.m4v', '.ogg', '.ogv', '.qt'
	];
	// Convert the filename to lowercase for case-insensitive comparison
	const lowerCaseFilename = filename.toLowerCase();
	// Check if the filename ends with any of the known video extensions
	return videoExtensions.some(extension => lowerCaseFilename.endsWith(extension));
}


/**
 * A very simple hashing algorithm (FNV-1a), good enough for caching (hashing arguments).
 * Do not use for cryptographic purposes.
 * @param {string|object} str 
 * @returns 
 */
function fnv1aHash(str) {
	if (typeof str != 'string') str = JSON.stringify(str);
    let hash = 0x811c9dc5; // 32-bit FNV-1a initial value
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16); // Convert to unsigned and return as hex
}

//#region RCView

if (typeof RCView == 'undefined') var RCView = (function() {

	// Keep track of already warned language keys
	const warned = {};

	return {
		getLangStringByKey: getLangStringByKey,
		langKeyExists: langKeyExists,
		lang_i: lang_i,
		$lang_i: $lang_i,
		toHtml: toHtml,
		tt: tt,
		$tt: $tt,
		tt_i: tt_i,
		$tt_i: $tt_i,
		trimForDropdownDisplay: trimForDropdownDisplay
	}

	/**
	 * Gets a language string from the language array, or returns a warning if the key does not exist.
	 * @param {string} langKey 
	 * @param {string} fallback (optional) Fallback string to use if the language key does not exist.
	 * @returns {string}
	 */
	function getLangStringByKey(langKey, fallback = null) {
		fallback = fallback ?? ('KEY NOT FOUND: ' + langKey);
		return langKeyExists(langKey) ? window['lang'][langKey] : fallback;
	}

	/**
	 * Checks if a language key exists in the language array. Outputs a warning to the 
	 * console once if the key does not exist.
	 * @param {string} langKey 
	 * @returns {boolean}
	 */
	function langKeyExists(langKey) {
		const exists = typeof window['lang'] != 'undefined' && typeof window['lang'][langKey] != 'undefined';
		if (!exists && typeof warned[langKey] == 'undefined') {
			warned[langKey] = true;
			console.warn('REDCap language key does not exist: ' + langKey);
		}
		return exists;
	}

	/** 
	 * Returns a string from the language array, interpolated with the given values,
	 * and wrapped in a span (unless otherwise specified). Use tt_i() for strings that need to
	 * support on-the-fly translation.
	 * @param {string} langKey The language key
	 * @param {Array} values An array of values to interpolate
	 * @param {boolean} escapeHTML Determines whether to escape HTML in interpolation values.
	 * @param {string} wrap The element type to wrap the string in (default: span).
	 * @param {object} attr Any attributes (name/value pairs) to add to the wrapping element.
	 * @param {string} fallback The fallback string to use if the language key does not exist.
	 * @returns {string|JQuery<HTMLElement>} Returns a string if wrap is empty, otherwise returns a jQuery object.
	 */
	function $lang_i(langKey, values = [], escapeHTML = true, wrap = 'span', attrs = {}, fallback = null) {
		const s = interpolateLangString(langKey, fallback, values, escapeHTML);
		return (typeof wrap != 'string' || wrap == '') ? s : wrapLangString(s, langKey, fallback, wrap, attrs);
	}

	/** 
	 * Returns a string from the language array, interpolated with the given values,
	 * and wrapped in a span (unless otherwise specified). Use tt_i() for strings that need to
	 * support on-the-fly translation.
	 * @param {string} langKey The language key
	 * @param {Array} values An array of values to interpolate
	 * @param {boolean} escapeHTML Determines whether to escape HTML in interpolation values.
	 * @param {string} wrap The element type to wrap the string in (default: span).
	 * @param {object} attr Any attributes (name/value pairs) to add to the wrapping element.
	 * @param {string} fallback The fallback string to use if the language key does not exist.
	 * @returns {string}
	 */
	function lang_i(langKey, values = [], escapeHTML = true, wrap = 'span', attrs = {}, fallback = null) {
		return toHtml($lang_i(langKey, values, escapeHTML, wrap, attrs, fallback));
	}

	/** 
	 * Returns a string from the language array, wrapped in a span (unless otherwise specified).
	 * @param {string} langKey The language key
	 * @param {string} wrap The element type to wrap the string in (default: span).
	 * @param {object} attr Any attributes (name/value pairs) to add to the wrapping element.
	 * @param {string} fallback The fallback string to use if the language key does not exist.
	 * @returns {string|JQuery<HTMLElement>} Returns a string if wrap is empty, otherwise returns a jQuery object.
	 */
	function $tt(langKey, wrap = 'span', attrs = {}, fallback = null) {
		const s = getLangStringByKey(langKey, fallback);
		return (typeof wrap != 'string' || wrap == '') ? s : wrapLangString(s, langKey, fallback, wrap, attrs);
	}

	/** 
	 * Returns a string from the language array, wrapped in a span (unless otherwise specified).
	 * @param {string} langKey The language key
	 * @param {string} wrap The element type to wrap the string in (default: span).
	 * @param {object} attr Any attributes (name/value pairs) to add to the wrapping element.
	 * @param {string} fallback The fallback string to use if the language key does not exist.
	 * @returns {string}
	 */
	function tt(langKey, wrap = 'span', attrs = {}, fallback = null) {
		return toHtml($tt(langKey, wrap, attrs, fallback));
	}

	/** 
	 * Returns a string from the language array, interpolated with the given values,
	 * and wrapped in a span (unless otherwise specified). This supports on-the-fly translation (use
	 * lang_i if on-the-fly translation is not needed, as then the values do not need to be 
	 * encoded in the resulting HTML).
	 * @param {string} langKey The language key
	 * @param {Array} values An array of values to interpolate
	 * @param {boolean} escapeHTML Determines whether to escape HTML in interpolation values.
	 * @param {string} wrap The element type to wrap the string in (default: span).
	 * @param {object} attr Any attributes (name/value pairs) to add to the wrapping element.
	 * @param {string} fallback The fallback string to use if the language key does not exist.
	 * @returns {string|JQuery<HTMLElement>} Returns a string if wrap is empty, otherwise returns a jQuery object.
	 */
	function $tt_i(langKey, values = [], escapeHTML = true, wrap = 'span', attrs = {}, fallback = null) {
		const s = interpolateLangString(langKey, fallback, values, escapeHTML);
		return (typeof wrap != 'string' || wrap == '') ? s : wrapLangString(s, langKey, fallback, wrap, attrs, values);
	}

	/** 
	 * Returns a string from the language array, interpolated with the given values,
	 * and wrapped in a span (unless otherwise specified). This supports on-the-fly translation (use
	 * lang_i if on-the-fly translation is not needed, as then the values do not need to be 
	 * encoded in the resulting HTML).
	 * @param {string} langKey The language key
	 * @param {Array} values An array of values to interpolate
	 * @param {boolean} escapeHTML Determines whether to escape HTML in interpolation values.
	 * @param {string} wrap The element type to wrap the string in (default: span).
	 * @param {object} attr Any attributes (name/value pairs) to add to the wrapping element.
	 * @param {string} fallback The fallback string to use if the language key does not exist.
	 * @returns {string}
	 */
	function tt_i(langKey, values = [], escapeHTML = true, wrap = 'span', attrs = {}, fallback = null) {
		return toHtml($tt_i(langKey, values, escapeHTML, wrap, attrs, fallback));
	}

	/**
	 * Helper to get the HTML code of an element
	 * @param {JQuery<HTMLElement} $el 
	 * @returns {string}
	 */
	function toHtml($el) {
		return $('<div></div>').append($el).html();
	}

	/**
	 * Helper to interpolate a language string with the given values, and to HTML-escape the values if specified
	 * @param {string} langKey The language key 
	 * @param {string} fallback The fallback string to use if the language key does not exist.
	 * @param {Array} values 
	 * @param {boolean} escapeHTML 
	 * @returns 
	 */
	function interpolateLangString(langKey, fallback, values, escapeHTML) {
		const s = getLangStringByKey(langKey, fallback);
		if (Array.isArray(values) == false) values = [values];
		if (escapeHTML) values = values.map(v => htmlspecialchars(''+v));
		return interpolateString(s, values);
	}

	/**
	 * Helper to wrap a language string in an HTML element and to add the given attributes (and optionally values)
	 * @param {string} s 
	 * @param {string} langKey 
	 * @param {string} fallback
	 * @param {string} wrap 
	 * @param {object} attrs 
	 * @param {Array} values 
	 * @returns {JQuery<HTMLElement>}
	 */
	function wrapLangString(s, langKey, fallback, wrap, attrs, values = []) { 
		if (typeof attrs != 'object') attrs = {};
		attrs['data-rc-lang'] = langKey;
		if (Array.isArray(values) && values.length > 0) {
			// Keep base64 encoding for compatibility with PHP version of tt_i()
			attrs['data-rc-lang-values'] = btoa(JSON.stringify(values));
		}
		const $wrapped = $('<' + wrap + '></' + wrap + '>').html(s);
		for (const attr in attrs) $wrapped.attr(attr, attrs[attr]);
		if (!langKeyExists(langKey) && !fallback) $wrapped.addClass('rc-lang-key-not-found');
		return $wrapped;
	}

	/**
	 * Trims a string for display in a dropdown. HTML tags are removed
	 * @param {string} text 
	 * @param {Number} maxLength 
	 * @param {string} suffix 
	 * @returns {string}
	 */
	function trimForDropdownDisplay(text, maxLength = 100, suffix = '&hellip;') {
		text = '' + text;
		text = strip_tags(text);
		if (text.length > maxLength) {
			return text.substring(0, maxLength) + suffix;
		} else {
			return text;
		}
	}

})();

//#endregion

// Returns a Promise<boolean> resolving true if the file is UTF-8 (with or without BOM) or plain ASCII.
// Usage (inside an async context): if (!await fileIsUTF8(file)) { ... }
async function fileIsUTF8(file) {
	return new Promise(function(resolve) {
		var reader = new FileReader();
		reader.onload = function(e) {
			var buf = new Uint8Array(e.target.result);
			// UTF-8 BOM (EF BB BF)
			if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return resolve(true);
			// Any other BOM = non-UTF-8
			if ((buf[0] === 0xFF && buf[1] === 0xFE) ||
				(buf[0] === 0xFE && buf[1] === 0xFF) ||
				(buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xFE && buf[3] === 0xFF) ||
				(buf[0] === 0xFF && buf[1] === 0xFE && buf[2] === 0x00 && buf[3] === 0x00)) return resolve(false);
			// No BOM — validate UTF-8 byte sequences (also accepts plain ASCII)
			var checkLen = Math.min(buf.length, 4096);
			var valid = true;
			var i = 0;
			while (i < checkLen) {
				var b = buf[i];
				var seqLen;
				if (b === 0x00) { valid = false; break; }          // null byte = UTF-16/32
				else if (b <= 0x7F) { seqLen = 1; }                // ASCII
				else if ((b & 0xE0) === 0xC0) { seqLen = 2; }      // 2-byte sequence
				else if ((b & 0xF0) === 0xE0) { seqLen = 3; }      // 3-byte sequence
				else if ((b & 0xF8) === 0xF0) { seqLen = 4; }      // 4-byte sequence
				else { valid = false; break; }                      // invalid lead byte
				// Validate continuation bytes
				for (var j = 1; j < seqLen; j++) {
					if (i + j >= checkLen) break;                   // partial sequence at buffer edge — acceptable
					if ((buf[i + j] & 0xC0) !== 0x80) { valid = false; break; }
				}
				if (!valid) break;
				i += seqLen;
			}
			resolve(valid);
		};
		reader.readAsArrayBuffer(file.slice(0, 4096));
	});
}

// Returns a Promise<boolean> resolving true if the file appears to be Shift-JIS encoded.
// Shift-JIS double-byte lead bytes are 0x81–0x9F and 0xE0–0xFC; trail bytes are 0x40–0xFC (excluding 0x7F).
// Single-byte half-width katakana occupies 0xA1–0xDF.
// A file is classified as Shift-JIS when it contains no invalid sequences and at least one
// multi-byte or half-width-katakana character (to distinguish it from plain ASCII).
async function fileIsShiftJIS(file) {
	return new Promise(function(resolve) {
		var reader = new FileReader();
		reader.onload = function(e) {
			var buf = new Uint8Array(e.target.result);
			// Reject known non-Shift-JIS BOMs
			if ((buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) || // UTF-8 BOM
				(buf[0] === 0xFF && buf[1] === 0xFE) ||                      // UTF-16 LE BOM
				(buf[0] === 0xFE && buf[1] === 0xFF)) return resolve(false); // UTF-16 BE BOM
			var checkLen = Math.min(buf.length, 4096);
			var hasShiftJisChars = false;
			var i = 0;
			while (i < checkLen) {
				var b = buf[i];
				if (b === 0x00) return resolve(false); // null byte rules out Shift-JIS
				// Double-byte lead byte range
				if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC)) {
					if (i + 1 >= checkLen) { i++; continue; } // incomplete at buffer edge
					var trail = buf[i + 1];
					if (trail < 0x40 || trail > 0xFC || trail === 0x7F) return resolve(false);
					hasShiftJisChars = true;
					i += 2;
				} else if (b >= 0xA1 && b <= 0xDF) {
					// Half-width katakana single byte
					hasShiftJisChars = true;
					i++;
				} else if (b <= 0x7F) {
					// ASCII-compatible single byte
					i++;
				} else {
					// 0x80, 0xA0, or 0xFD–0xFF — invalid in Shift-JIS
					return resolve(false);
				}
			}
			resolve(hasShiftJisChars);
		};
		reader.readAsArrayBuffer(file.slice(0, 4096));
	});
}

// Attach an async handler to a file input's change event.
// asyncFn receives the File object and is awaited automatically.
// Usage: onFileChange('#uploadedfile', async function(file) {
//            if (!await fileIsUTF8(file)) alert('Not UTF-8!');
//        });
function onFileChange(selector, asyncFn)
{
	$(document).on('change', selector, async function(e) {
		var input = this;
		var file = input.files[0];
		if (!file) return;
		var result = await asyncFn(file);
		// If asyncFn returns false, reset the file input and stop propagation
		if (result === false) {
			input.value = '';
			e.stopImmediatePropagation();
		}
	});
}

// Initializes an onchange check for file input fields to ensure the file isn't mangled due to incorrect encoding
function initCsvUploadUtf8Check(selector)
{
	onFileChange(selector, async function(file) {
		if (!await fileIsUTF8(file) && !await fileIsShiftJIS(file)) {
			simpleDialog(lang.bottom_122, lang.global_01);
			return false; // resets the file input and stops further onchange execution
		}
	});
}

