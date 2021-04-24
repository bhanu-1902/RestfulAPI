/* eslint-disable max-lines */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define parseInt */

/**
 * This service provides useful APIs for the date and Time formatting. It allows to se the default date and time format for the session.
 *
 * @module js/dateTimeService
 *
 * @publishedApolloService
 */
define( [
    'app',
    'lodash',
    'js/eventBus',

    'js/localeService'
], function( app, _, eventBus ) {
    'use strict';

    /**
     * Default locale specific date/time values used until login is complete.
     */
    var _dateTimeLocaleInfo = {
        is12HrFormat: false,
        sessionDateTimeFormat: 'dd-MMM-yyyy HH:mm',
        sessionDateFormat: 'dd-MMM-yyyy',
        sessionTimeFormat: 'HH:mm'
    };

    /** Regular expression that matches a number between 0 and 59 */
    var _regMinSec = /([0-5]?\d)/;

    /**
     * @private
     */
    var _englishDateTimeFormat = {
        dateFilterFormat: 'dd-MMM-yyyy HH:mm',
        datePickerFormat: 'dd-M-yy',
        datePlaceholder: 'DD-MMM-YYYY',
        timePlaceholder: 'HH:MM',
        monthAfterYear: false,
        dayOfWeekAfterDay: false
    };

    /**
     * @private
     */
    var _englishDateFormat = {
        dateFilterFormat: 'dd-MMM-yyyy',
        datePickerFormat: 'dd-M-yy',
        datePlaceholder: 'DD-MMM-YYYY',
        timePlaceholder: '',
        monthAfterYear: false,
        dayOfWeekAfterDay: false
    };

    /**
     * @private
     */
    var _englishTimeFormat = {
        dateFilterFormat: 'HH:mm',
        datePickerFormat: '',
        datePlaceholder: '',
        timePlaceholder: 'HH:MM',
        monthAfterYear: false,
        dayOfWeekAfterDay: false
    };

    /**
     * Cached reference to injected AngularJS $filter service.
     *
     * @private
     */
    var _$filter = null;

    /**
     * @private
     */
    var _i18n_anteMeridiem = 'AM';

    /**
     * @private
     */
    var _i18n_postMeridiem = 'PM';

    /**
     * Cached reference to injected AngularJS $locale service.
     *
     * @private
     */
    var _$locale = null;

    /**
     * Cached reference to injected 'localeService'.
     *
     * @private
     */
    var _localeSvc = null;

    /**
     * Regular expression value to extract segments of a 12 hour time entry
     *
     * @private
     */
    var _regPattern12 = null;

    /**
     * Regular expression value to extract segments of a 24 hour time entry
     *
     * @private
     */
    var _regPattern24 = null;

    /**
     * @private
     */
    var _localePlaceholders = {
        cs_CZ: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'DD',
            year_2: 'RR',
            year_4: 'RRRR',
            hours: 'hodina',
            minutes: 'minuty',
            seconds: 'sekundy',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        de: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'DD',
            year_2: 'YY',
            year_4: 'YYYY',
            hours: 'Stunde',
            minutes: 'Minuten',
            seconds: 'Sekunden',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        en_US: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'DD',
            year_2: 'YY',
            year_4: 'YYYY',
            hours: 'HH',
            minutes: 'MM',
            seconds: 'SS',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        es: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'DD',
            year_2: 'AA',
            year_4: 'AAAA',
            hours: 'horas',
            minutes: 'minutos',
            seconds: 'segundos',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        fr: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'JJ',
            year_2: 'AA',
            year_4: 'AAAA',
            hours: 'heure',
            minutes: 'minutes',
            seconds: 'secondes',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        it: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'DD',
            year_2: 'YY',
            year_4: 'YYYY',
            hours: 'ora',
            minutes: 'minuto',
            seconds: 'secondo',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        ja_JP: {
            month_2: '月',
            month_3: '月',
            month_4: '月',
            day: '日',
            year_2: '年',
            year_4: '年',
            hours: '時間',
            minutes: '分',
            seconds: '秒',
            monthAfterYear: false,
            dayOfWeekAfterDay: true,
            fullDayOfMonth: true,
            fullMonthAndDayOfMonthWithDayOfWeek: true,
            fullMonthFormatForMonth: true,
            dayOfWeekSeparator: ' ',
            monthDaySeparator: '',
            dateTimeSeparator: ' '
        },
        ko_KR: {
            month_2: '월',
            month_3: '월',
            month_4: '월',
            day: '일',
            year_2: '년',
            year_4: '년',
            hours: '시간',
            minutes: '분',
            seconds: '초',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        pl_PL: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'DD',
            year_2: 'RR',
            year_4: 'RRRR',
            hours: 'godzin',
            minutes: 'minut',
            seconds: 'drugi',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        pt_BR: {
            month_2: 'MM',
            month_3: 'MMM',
            month_4: 'MMMM',
            day: 'DD',
            year_2: 'AA',
            year_4: 'AAAA',
            hours: 'hora',
            minutes: 'minuto',
            seconds: 'segundo',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        ru_RU: {
            month_2: 'мм',
            month_3: 'ммм',
            month_4: 'мммм',
            day: 'дд',
            year_2: 'гг',
            year_4: 'гггг',
            hours: 'часы',
            minutes: 'минуты',
            seconds: 'секунды',
            monthAfterYear: false,
            dayOfWeekAfterDay: false,
            fullDayOfMonth: false,
            fullMonthAndDayOfMonthWithDayOfWeek: false,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: '-',
            monthDaySeparator: ' ',
            dateTimeSeparator: ' - '
        },
        zh_CN: {
            month_2: '月',
            month_3: '月',
            month_4: '月',
            day: '日',
            year_2: '年',
            year_4: '年',
            hours: '小时',
            minutes: '分钟',
            seconds: '秒',
            monthAfterYear: true,
            dayOfWeekAfterDay: true,
            fullDayOfMonth: true,
            fullMonthAndDayOfMonthWithDayOfWeek: true,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: ' ',
            monthDaySeparator: '',
            dateTimeSeparator: ' '
        },
        zh_TW: {
            month_2: '月',
            month_3: '月',
            month_4: '月',
            day: '日',
            year_2: '年',
            year_4: '年',
            hours: '小時',
            minutes: '分鐘',
            seconds: '秒',
            monthAfterYear: true,
            dayOfWeekAfterDay: true,
            fullDayOfMonth: true,
            fullMonthAndDayOfMonthWithDayOfWeek: true,
            fullMonthFormatForMonth: false,
            dayOfWeekSeparator: ' ',
            monthDaySeparator: '',
            dateTimeSeparator: ' '
        }
    };

    /**
     * @private
     */
    var _datePickerFormat = _englishDateTimeFormat.datePickerFormat;

    /**
     * @private
     */
    var _datePlaceholder = _englishDateTimeFormat.datePlaceholder;

    /**
     * TRUE if the i18N requires the month to be shown after the year in the JQuery datePicker.
     *
     * @private
     */
    var _showMonthAfterYear = _englishDateTimeFormat.showMonthAfterYear;

    /**
     * @private
     */
    var _timePlaceholder = _englishDateTimeFormat.timePlaceholder;

    /**
     * List of 24 hour time selections (in current 12/24 hour format).
     *
     * @private
     */
    var _timeLovEntries = null;

    /**
     * @private
     */
    var _dateFilterFormat = _englishDateFormat.dateFilterFormat;

    /**
     * Function to build the list of time values in the drop down list of (aw-property-time-val) UI.
     *
     * @private
     *
     * @returns {LovEntry[]} An array of 'lovEntry' populated with the internal an display values.
     */
    var _buildTimeLovEntries = function() {
        var lovEntries = [];

        var _pad = function( number ) {
            if( number < 10 ) {
                return '0' + number;
            }
            return number;
        };

        var msHr = 1000 * 60 * 60;
        var msLimit = msHr * 24;
        var msInc = 1000 * 60 * 30;

        for( var msTime = 0; msTime < msLimit; msTime += msInc ) {
            var date = new Date( msTime );

            var utcHours = date.getUTCHours();
            var utcMinutes = date.getUTCMinutes();
            var mer;
            var disp;

            if( _dateTimeLocaleInfo.is12HrFormat ) {
                if( utcHours < 12 ) {
                    if( utcHours === 0 ) {
                        utcHours += 12;
                    }
                    mer = _i18n_anteMeridiem;
                } else {
                    if( utcHours > 12 ) {
                        utcHours -= 12;
                    }
                    mer = _i18n_postMeridiem;
                }

                disp = _pad( utcHours ) + ':' + _pad( utcMinutes ) + ' ' + mer;
            } else {
                disp = _pad( utcHours ) + ':' + _pad( utcMinutes );
            }

            var lovEntry = {
                propInternalValue: msTime,
                propDisplayValue: disp
            };

            lovEntries.push( lovEntry );
        }

        return lovEntries;
    };

    /**
     * @private
     *
     * @returns {String} Regular expression that matches segments of a user's input string for 12 hours, optional
     *         minutes, optional seconds and optional meridiem.
     */
    var _getTimePattern12Hr = function() {
        if( !_regPattern12 ) {
            var _regHr12 = /(1[012]|0\d|\d)/;

            var _regGap = /\s*/;

            var _regMeridiem = new RegExp( '(' + _i18n_anteMeridiem + //
                '|' + _i18n_postMeridiem + '|a|p|am|pm' + ')?' );

            /** hh:mm:ss a */
            var _reg12HrMnSec = new RegExp( '(^' + _regHr12.source + //
                ':' + _regMinSec.source + ':' + _regMinSec.source + //
                _regGap.source + _regMeridiem.source + '$)' );

            /** hh:mm a */
            var _reg12HrMin = new RegExp( '(^' + _regHr12.source + //
                ':' + _regMinSec.source + _regGap.source + //
                _regMeridiem.source + '$)' );

            /** hh a */
            var _reg12Hr = new RegExp( '(^' + _regHr12.source + //
                _regGap.source + _regMeridiem.source + '$)' );

            // aggregate of all sub expressions
            _regPattern12 = new RegExp( _reg12HrMnSec.source + //
                '|' + _reg12HrMin.source + '|' + _reg12Hr.source );
        }

        return _regPattern12;
    };

    /**
     * @private
     *
     * @returns {String} Regular expression that matches segments of a user's input string for 24 hours, optional minutes
     *         and optional seconds.
     */
    var _getTimePattern24Hr = function() {
        if( !_regPattern24 ) {
            var _regHr24 = /([0-1]?\d|2[0-3])/;

            /** HH:mm:ss : https://regex101.com/ */
            var _reg24HrMnSec = new RegExp( '(^' + _regHr24.source + //
                ':' + _regMinSec.source + ':' + _regMinSec.source + '$)' );

            /** HH:mms */
            var _reg24HrMin = new RegExp( '(^' + _regHr24.source + //
                ':' + _regMinSec.source + '$)' );

            /** HH */
            var _reg24Hr = new RegExp( '(^' + _regHr24.source + '$)' );

            // aggregate of all sub expressions
            _regPattern24 = new RegExp( _reg24HrMnSec.source + //
                '|' + _reg24HrMin.source + '|' + _reg24Hr.source );
        }

        return _regPattern24;
    };

    // /**
    //  * Logs pattern matching details for given value (very handy for debugging).
    //  *
    //  * @private
    //  *
    //  * @param {String[]} matches -
    //  *
    //  * @param {String} value -
    //  */
    // var _logMatches = function( pattern, matches, value ) {
    //     logger.info( pattern + '\n' + value );
    //     if( matches ) {
    //         for( var ndx = 0; ndx < matches.length; ndx++ ) {
    //             logger.info( ndx + ": " + matches[ ndx ] );
    //         }
    //     }
    // };

    /**
     * Function to tokenize the time input.
     *
     * @private
     *
     * @param {String} timeString - Time string to tokenize in 'hh:mmm:ss a' format.
     *
     * @return {Number[]} Array of integers representing extracted hours, minutes and seconds.
     */
    var _tokenizeTime = function( timeString ) {
        var time_AmPm = timeString.split( " " );

        var hour_minuteArray = time_AmPm[ 0 ].split( /[:aApP\s]+/ );

        var hour = 0;

        if( hour_minuteArray.length > 0 ) {
            hour = parseInt( hour_minuteArray[ 0 ], 10 );

            if( _dateTimeLocaleInfo.is12HrFormat ) {
                if( time_AmPm[ 1 ] === _i18n_postMeridiem ) {
                    hour += 12;

                    if( hour >= 24 ) {
                        hour = 0;
                    }
                }
            }

            if( hour > 23 ) {
                hour = 23;
            }
        }

        var minute = 0;

        if( hour_minuteArray.length > 1 ) {
            minute = parseInt( hour_minuteArray[ 1 ], 10 );

            if( minute > 59 ) {
                minute = 59;
            }
        }

        var second = 0;

        if( hour_minuteArray.length > 2 ) {
            second = parseInt( hour_minuteArray[ 2 ], 10 );

            if( isNaN( second ) ) {
                second = 0;
            }

            if( second > 59 ) {
                second = 59;
            }
        }

        var splitTimeData = [];

        splitTimeData[ 0 ] = hour;
        splitTimeData[ 1 ] = minute;
        splitTimeData[ 2 ] = second;

        return splitTimeData;
    };

    /**
     * @param {String} dateFormat - The string from the TextServer used to construct the return date and/or time Format.
     *
     * @param {Boolea} includeDate - TRUE if date should be included in the format
     *
     * @param {Boolean} includeTime - TRUE if time should be included in the format
     *
     * @return {Object} An object with properties:<br>
     *         'dateFilterFormat' set with the converted pattern compatible with AngularJS "$filter('date')"
     *         <p>
     *         'datePickerFormat' set with the converted pattern compatible with the 'dateFormat' property (in the
     *         'options' object) and 'formatDate' and 'parseDate' functions of JQueryUI's 'datePicker'.
     *         <p>
     *         'datePlaceholder' set with i18N text to display in an empty date input field.
     *         <p>
     *         'timePlaceholder' set with i18N text to display in an empty time input field.
     *         <p>
     *         'monthAfterYear' set with TRUE if the i18N requires the month to be shown after the year in the JQuery
     *         datePicker.
     */
    var _getDateFormatByServerString = function( dateFormat, includeDate, includeTime ) { // eslint-disable-line complexity
        var dateFilterFormat = '';
        var datePickerFormat = '';
        var datePlaceholder = '';
        var timePlaceholder = '';

        var localePlaceHolder = _localePlaceholders[ _localeSvc.getLocale() ];

        var monthAfterYear = localePlaceHolder.monthAfterYear;

        _dateTimeLocaleInfo.is12HrFormat = false;

        if( dateFormat && dateFormat.length > 0 ) {
            var containsSeconds = dateFormat.indexOf( '%S' ) !== -1;

            var format = dateFormat.trim();

            var formatLength = format.length;

            for( var i = 0; i < formatLength; i++ ) {
                var c = format.charAt( i );

                switch ( c ) {
                    case '%':
                        // ignore printf-specific char
                        break;

                    case 'd':
                        if( includeDate ) {
                            // d: day of the month(0-31) -> dd: day in month (two digits)
                            dateFilterFormat = dateFilterFormat.concat( "dd" );
                            datePickerFormat = datePickerFormat.concat( "dd" );
                            datePlaceholder = datePlaceholder.concat( localePlaceHolder.day );
                        }
                        break;

                    case 'b':
                        if( includeDate ) {
                            // b: abbreviated month name -> MMM: month in year (full month name) not supported by Java.
                            dateFilterFormat = dateFilterFormat.concat( "MMM" );
                            datePickerFormat = datePickerFormat.concat( "M" );
                            datePlaceholder = datePlaceholder.concat( localePlaceHolder.month_3 );
                        }
                        break;

                    case 'B':
                        if( includeDate ) {
                            // B: full month name -> MMMMM: month in year (full month name)
                            dateFilterFormat = dateFilterFormat.concat( "MMMM" );
                            datePickerFormat = datePickerFormat.concat( "MM" );
                            datePlaceholder = datePlaceholder.concat( localePlaceHolder.month_4 );
                        }
                        break;

                    case 'm':
                        if( includeDate ) {
                            // m: month(01-12) -> MM: month in year (two digits)
                            dateFilterFormat = dateFilterFormat.concat( "MM" );
                            datePickerFormat = datePickerFormat.concat( "mm" );
                            datePlaceholder = datePlaceholder.concat( localePlaceHolder.month_2 );
                        }
                        break;

                    case 'y':
                        if( includeDate ) {
                            // y: year without century(00-99) -> yy: year (two digits).
                            dateFilterFormat = dateFilterFormat.concat( "yy" );
                            datePickerFormat = datePickerFormat.concat( "y" );
                            datePlaceholder = datePlaceholder.concat( localePlaceHolder.year_2 );
                        }
                        break;

                    case 'Y':
                        if( includeDate ) {
                            // Y: year with century(1970-2069) ->yyyy: year (four digits)
                            dateFilterFormat = dateFilterFormat.concat( "yyyy" );
                            datePickerFormat = datePickerFormat.concat( "yy" );
                            datePlaceholder = datePlaceholder.concat( localePlaceHolder.year_4 );
                        }
                        break;

                    case 'H':
                        if( includeTime ) {
                            // H: hour(24-hour clock)(00-23) ->HH: hour in day (0~23) (two digits)
                            dateFilterFormat = dateFilterFormat.concat( "HH" );
                            timePlaceholder = timePlaceholder.concat( localePlaceHolder.hours );
                        }
                        break;

                    case 'I':
                        if( includeTime ) {
                            _dateTimeLocaleInfo.is12HrFormat = true;

                            // I: hour(12-hour clock)(01-12) ->hh: hour in am/pm (1~12) (two digits)
                            dateFilterFormat = dateFilterFormat.concat( "hh" );
                            timePlaceholder = timePlaceholder.concat( localePlaceHolder.hours );
                        }
                        break;

                    case 'M':
                        if( includeTime ) {
                            // M: minute(00-59) -> mm: minute in hour (two digits)
                            dateFilterFormat = dateFilterFormat.concat( "mm" );
                            timePlaceholder = timePlaceholder.concat( localePlaceHolder.minutes );

                            /**
                             * Note: This is a little 'odd' but the placeholder has to have 'seconds' in it even if the
                             * general display for time does not.
                             */
                            if( !containsSeconds ) {
                                timePlaceholder = timePlaceholder.concat( ':' + localePlaceHolder.seconds );
                            }
                        }
                        break;

                    case 'S':
                        if( includeTime ) {
                            // S: second(00-59) -> ss: second in minute (two digits)
                            dateFilterFormat = dateFilterFormat.concat( "ss" );
                            timePlaceholder = timePlaceholder.concat( localePlaceHolder.seconds );
                        }
                        break;

                    default:
                        // If ":" exists in the format, assume it must be a separator for time.
                        if( !includeTime && c === ":" ) {
                            break;
                        }

                        // If "-" exists in the format, assume it must be a separator for date.
                        if( !includeDate && c === "-" ) {
                            break;
                        }

                        // If "." exists in the format, assume it must be a separator for date.
                        if( !includeDate && c === "." ) {
                            break;
                        }

                        // If "/" exists in the format, assume it must be a separator for date.
                        if( !includeDate && c === "/" ) {
                            break;
                        }

                        // If "," exists in the format, assume it must be a separator for date.
                        if( !includeDate && c === "," ) {
                            break;
                        }

                        // If " " exists in the format, assume it must be a separator for date.
                        if( !includeDate && c === " " ) {
                            break;
                        }

                        // If "年" (year) "月" (month) or "日" (day) exists in the format, assume it must be a separator for date.
                        if( !includeDate && ( c === "年" || c === '月' || c === '日' ) ) {
                            break;
                        }

                        dateFilterFormat += c;

                        if( c === ":" ) {
                            timePlaceholder += c;
                        }

                        if( c === '-' || c === '.' || c === '/' || c === ',' || c === ' ' ) {
                            datePickerFormat += c;
                            datePlaceholder += c;
                        }

                        break;
                }
            }
        } else {
            if( includeDate ) {
                if( includeTime ) {
                    dateFilterFormat = _englishDateTimeFormat.dateFilterFormat;
                    datePickerFormat = _englishDateTimeFormat.datePickerFormat;
                    datePlaceholder = _englishDateTimeFormat.datePlaceholder;
                    timePlaceholder = _englishDateTimeFormat.timePlaceholder;
                    monthAfterYear = _englishDateTimeFormat.monthAfterYear;
                } else {
                    dateFilterFormat = _englishDateFormat.dateFilterFormat;
                    datePickerFormat = _englishDateFormat.datePickerFormat;
                    datePlaceholder = _englishDateFormat.datePlaceholder;
                    timePlaceholder = _englishDateFormat.timePlaceholder;
                    monthAfterYear = _englishDateFormat.monthAfterYear;
                }
            } else if( includeTime ) {
                dateFilterFormat = _englishTimeFormat.dateFilterFormat;
                datePickerFormat = _englishTimeFormat.datePickerFormat;
                datePlaceholder = _englishTimeFormat.datePlaceholder;
                timePlaceholder = _englishTimeFormat.timePlaceholder;
                monthAfterYear = _englishTimeFormat.monthAfterYear;
            }
        }

        /**
         * Insert AM/PM indicator (if necessary)<BR>
         * If so: Insert it after either seconds, minutes or hours.
         */
        if( _dateTimeLocaleInfo.is12HrFormat && includeTime ) {
            var ndx = dateFilterFormat.lastIndexOf( "ss" );

            if( ndx !== -1 ) {
                dateFilterFormat = dateFilterFormat.substring( 0, ndx + 2 ) + " a" +
                    dateFilterFormat.substring( ndx + 2 );
            } else {
                ndx = dateFilterFormat.lastIndexOf( "mm" );

                if( ndx !== -1 ) {
                    dateFilterFormat = dateFilterFormat.substring( 0, ndx + 2 ) + " a" +
                        dateFilterFormat.substring( ndx + 2 );
                } else {
                    ndx = dateFilterFormat.lastIndexOf( "hh" );

                    if( ndx !== -1 ) {
                        dateFilterFormat = dateFilterFormat.substring( 0, ndx + 2 ) + " a" +
                            dateFilterFormat.substring( ndx + 2 );
                    }
                }
            }
        }

        return {
            dateFilterFormat: dateFilterFormat.trim(),
            datePickerFormat: datePickerFormat.trim(),
            datePlaceholder: datePlaceholder.trim(),
            timePlaceholder: timePlaceholder.trim(),
            monthAfterYear: monthAfterYear
        };
    };

    var exports = {};

    /**
     */
    var _setupDateTimeLocaleInfo = function() {
        _localeSvc.getTextPromise( 'dateTimeServiceMessages' ).then(
            function( textBundle ) {
                _i18n_anteMeridiem = textBundle.anteMeridiem;
                _i18n_postMeridiem = textBundle.postMeridiem;

                if( _$locale ) {
                    _$locale.id = _localeSvc.getLocale();

                    _$locale.DATETIME_FORMATS.AMPMS = [ textBundle.anteMeridiem, textBundle.postMeridiem ];

                    _$locale.DATETIME_FORMATS.DAY = [ textBundle.dayName_01, textBundle.dayName_02,
                        textBundle.dayName_03, textBundle.dayName_04, textBundle.dayName_05, textBundle.dayName_06,
                        textBundle.dayName_07
                    ];

                    _$locale.DATETIME_FORMATS.MONTH = [ textBundle.monthName_01, textBundle.monthName_02,
                        textBundle.monthName_03, textBundle.monthName_04, textBundle.monthName_05,
                        textBundle.monthName_06, textBundle.monthName_07, textBundle.monthName_08,
                        textBundle.monthName_09, textBundle.monthName_10, textBundle.monthName_11,
                        textBundle.monthName_12
                    ];

                    _$locale.DATETIME_FORMATS.SHORTDAY = [ textBundle.dayNameShort_01, textBundle.dayNameShort_02,
                        textBundle.dayNameShort_03, textBundle.dayNameShort_04, textBundle.dayNameShort_05,
                        textBundle.dayNameShort_06, textBundle.dayNameShort_07
                    ];

                    _$locale.DATETIME_FORMATS.SHORTMONTH = [ textBundle.monthNameShort_01,
                        textBundle.monthNameShort_02, textBundle.monthNameShort_03, textBundle.monthNameShort_04,
                        textBundle.monthNameShort_05, textBundle.monthNameShort_06, textBundle.monthNameShort_07,
                        textBundle.monthNameShort_08, textBundle.monthNameShort_09, textBundle.monthNameShort_10,
                        textBundle.monthNameShort_11, textBundle.monthNameShort_12
                    ];
                }

                eventBus.publish( 'dateTime.changed', _dateTimeLocaleInfo );
            } );
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {Number} The numeric value corresponding to the time for the given date according to universal time.
     */
    var _getDateTime = function( dateToFormat ) {
        var dateTime;

        if( !dateToFormat ) {
            return dateTime;
        }

        if( _.isString( dateToFormat ) || _.isNumber( dateToFormat ) ) {
            dateTime = dateToFormat;
        } else {
            dateTime = dateToFormat.getTime();
        }
        return dateTime;
    };

    /**
     * {String} Null date/time string for 1 Jan, 0001 at midnight GMT.
     * @ignore
     */
    exports.NULLDATE = "0001-01-01T00:00:00+00:00";

    /**
     * Definition of 'null' or 'not yet set' date time.
     * <P>
     * Same value as AW's IDateService.getNullLocalDate().
     *
     * @private
     */
    var _nullGmtDate = new Date( exports.NULLDATE );

    /**
     * @private
     */
    var offset = _nullGmtDate.getTimezoneOffset();

    /**
     * @private
     */
    var _nullGmtTime = _getDateTime( _nullGmtDate );

    /**
     * @private
     */
    var _nullLocalDate = new Date( _nullGmtTime + offset * 60 * 1000 );

    /**
     * @private
     */
    var _nullLocalDateString;

    /**
     * @private
     */
    var _epochDate = new Date( 0 );

    /**
     * ************************************<BR>
     * ***** Define service API <BR>
     * ************************************<BR>
     */

    /**
     * @return {Promise} TODO
     *
     *@ignore
     */
    exports.getJQueryDatePickerTextBundle = function() {
        if( !_localeSvc ) {
            var injector = app.getInjector();

            if( injector ) {
                _localeSvc = injector.get( 'localeService' );
            }
        }

        if( _localeSvc ) {
            return _localeSvc.getTextPromise( 'dateTimeServiceMessages' )
                .then(
                    function( textBundle ) {
                        if( !textBundle ) {
                            return {};
                        }

                        return {
                            closeText: textBundle.closeText,
                            prevText: textBundle.prevText,
                            nextText: textBundle.nextText,
                            currentText: textBundle.currentText,
                            monthNames: [ textBundle.monthName_01, textBundle.monthName_02, textBundle.monthName_03,
                                textBundle.monthName_04, textBundle.monthName_05, textBundle.monthName_06,
                                textBundle.monthName_07, textBundle.monthName_08, textBundle.monthName_09,
                                textBundle.monthName_10, textBundle.monthName_11, textBundle.monthName_12
                            ],
                            monthNamesShort: [ textBundle.monthNameShort_01, textBundle.monthNameShort_02,
                                textBundle.monthNameShort_03, textBundle.monthNameShort_04,
                                textBundle.monthNameShort_05, textBundle.monthNameShort_06,
                                textBundle.monthNameShort_07, textBundle.monthNameShort_08,
                                textBundle.monthNameShort_09, textBundle.monthNameShort_10,
                                textBundle.monthNameShort_11, textBundle.monthNameShort_12
                            ],
                            dayNames: [ textBundle.dayName_01, textBundle.dayName_02, textBundle.dayName_03,
                                textBundle.dayName_04, textBundle.dayName_05, textBundle.dayName_06,
                                textBundle.dayName_07
                            ],
                            dayNamesShort: [ textBundle.dayNameShort_01, textBundle.dayNameShort_02,
                                textBundle.dayNameShort_03, textBundle.dayNameShort_04, textBundle.dayNameShort_05,
                                textBundle.dayNameShort_06, textBundle.dayNameShort_07
                            ],
                            dayNamesMin: [ textBundle.dayNameMin_01, textBundle.dayNameMin_02,
                                textBundle.dayNameMin_03, textBundle.dayNameMin_04, textBundle.dayNameMin_05,
                                textBundle.dayNameMin_06, textBundle.dayNameMin_07
                            ],
                            weekHeader: textBundle.weekHeader,
                            dateFormat: _datePickerFormat,
                            firstDay: 1,
                            isRTL: false,
                            showMonthAfterYear: _showMonthAfterYear,
                            yearSuffix: textBundle.yearSuffix
                        };
                    } );
        }

        return {
            then: function() {
                //
            }
        };
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The formatted date of the given Date object formatted according to current user session format.
     */
    exports.formatDate = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, exports.getDateFilterFormat() );
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The formatted date & time of the given Date object formatted according to current user session
     *          format.
     */
    exports.formatDateTime = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, exports.getDateTimeFilterFormat() );
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The formatted time of the given Date object formatted according to current user session format.
     */
    exports.formatTime = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, exports.getTimeFilterFormat() );
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The formatted time of the given Date object formatted according to current user session format
     *          and meant for display in an lovEntry (i.e. without 'seconds').
     * @ignore
     */
    exports.formatTimeLovEntry = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, exports.getTimeLovEntryFilterFormat() );
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The date & time of the given Date object formatted according to current user session format.
     */
    exports.formatSessionDateTime = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var formattedDate = '';

            var dateValue = _getDateTime( dateToFormat );

            if( _.isNumber( dateValue ) ) {
                formattedDate = _$filter( 'date' )( dateValue, exports.getSessionDateTimeFormat() );
            } else if( _.isDate( dateValue ) ) {
                formattedDate = _$filter( 'date' )( _getDateTime( dateValue ), exports.getSessionDateTimeFormat() );
            }

            return formattedDate;
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The date & time of the given Date object formatted according to current user session format.
     */
    exports.formatSessionDate = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            var format = exports.getSessionDateFormat();

            if( format.length > 0 ) {
                return _$filter( 'date' )( dateValue, exports.getSessionDateFormat() );
            }

            return '';
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The time portion of the given Date object formatted according to current user session format.
     */
    exports.formatSessionTime = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            var format = exports.getSessionTimeFormat();

            if( format.length > 0 ) {
                return _$filter( 'date' )( dateValue, exports.getSessionTimeFormat() );
            }
            return '';
        }

        return dateToFormat.toString();
    };

    /**
     * Example: Tuesday-Sep 27
     *
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The date of the given Date object formatted according to current user session format.
     */
    exports.formatWeekdayMonthAndDayOfMonth = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            var dayOfWeek = _$filter( 'date' )( dateValue, 'EEEE' );
            var month = exports.formatAbbreviatedMonth( dateValue );
            var dayOfMonth = exports.formatFullDayOfMonth( dateValue );

            var locale = _localeSvc.getLocale();
            if( _localePlaceholders[ locale ].dayOfWeekAfterDay ) {
                return month + _localePlaceholders[ locale ].monthDaySeparator + dayOfMonth +
                    _localePlaceholders[ locale ].dayOfWeekSeparator + dayOfWeek;
            }

            return dayOfWeek + _localePlaceholders[ locale ].dayOfWeekSeparator + month +
                _localePlaceholders[ locale ].monthDaySeparator + dayOfMonth;
        }

        return dateToFormat.toString();
    };

    /**
     * Example: 27
     * <P>
     * Note: In some locales (i.e. ja_JP) there are extra symbols added to this number. This function will handle this
     * case.
     *
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The date & time of the given Date object formatted according to current user session format.
     */
    exports.formatFullDayOfMonth = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            var dayOfMonth = _$filter( 'date' )( dateValue, 'dd' );

            var locale = _localeSvc.getLocale();
            if( _localePlaceholders[ locale ].fullDayOfMonth ) {
                dayOfMonth += _localePlaceholders[ locale ].day;
            }

            return dayOfMonth;
        }

        return dateToFormat.toString();
    };

    /**
     * Example: September
     *
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The date & time of the given Date object formatted according to current user session format.
     */
    exports.formatAbbreviatedMonth = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, 'MMM' );
        }

        return dateToFormat.toString();
    };

    /**
     * Example: September
     *
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The date & time of the given Date object formatted according to current user session format.
     */
    exports.formatFullMonth = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }

        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, 'MMMM' );
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @returns {String} The formatted date & time of the given Date object formatted according to UTC format.
     */
    exports.formatUTC = function( dateToFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }
        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, "yyyy-MM-dd'T'HH:mm:ssZ" );
        }

        return dateToFormat.toString();
    };

    /**
     * @param {Number|Date} dateToFormat - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @param {String} dateFormat - format. This is a EWI data collection object time stamp format.
     *
     * @returns {String} The date & time of the given Date object formatted according to the input dateFormat.
     */
    exports.formatNonStandardDate = function( dateToFormat, dateFormat ) {
        if( exports.isNullDate( dateToFormat ) ) {
            return '';
        }
        if( _$filter ) {
            var dateValue = _getDateTime( dateToFormat );

            return _$filter( 'date' )( dateValue, dateFormat );
        }

        return dateToFormat.toString();
    };

    /**
     * @return {String} AngularJS $filter format to display a date & time entry in.
     */
    exports.getDateFilterFormat = function() {
        return _dateFilterFormat;
    };

    /**
     * Format compatible with the 'dateFormat' property (in the 'options' object) and 'formatDate' and 'parseDate'
     * functions of JQueryUI's 'datePicker'.
     * <P>
     * Examples: <BR>
     * Format 'dd-M-yy' would return "01-Apr-2016"<BR>
     * Format 'mm.dd.yy' would return "04.01.2016"<BR>
     *
     * @return {String} Date entry format for use in JQueryUI's datepicker API.
     */
    exports.getDateFormat = function() {
        return _datePickerFormat;
    };

    /**
     * @return {String} User oriented text used to indicate the required format of the date entry (i.e. "yy.mm.dd",
     *         "day-month-year", etc.).
     */
    exports.getDateFormatPlaceholder = function() {
        return _datePlaceholder;
    };

    /**
     * @return {String} AngularJS $filter format to display a date & time entry in.
     */
    exports.getDateTimeFilterFormat = function() {
        return exports.getDateFilterFormat() + _localePlaceholders[ _localeSvc.getLocale() ].dateTimeSeparator +
            exports.getTimeFilterFormat();
    };

    /**
     * @param {DateTimeApi} dateApi - Object containing the current date/time context.
     *
     * @return {Date} Date object set to either 'today' or to 'minDate' or 'maxDate' if 'today' is outside those ranges.
     *         The 'minDate' or 'maxDate' will be chosen based on which of those values 'today' is closer to.
     * @ignore
     */
    exports.getDefaultDate = function( dateApi ) {
        var defaultDate;

        var limitDate;

        if( dateApi.isTimeEnabled ) {
            if( dateApi.isDateEnabled ) {
                /**
                 * Deal with date & time
                 *
                 * @private
                 */
                defaultDate = new Date();

                defaultDate.setHours( 0 );
                defaultDate.setMinutes( 0 );
                defaultDate.setSeconds( 0 );

                if( dateApi.minDate && defaultDate < dateApi.minDate ) {
                    return dateApi.minDate;
                }

                if( dateApi.maxDate && defaultDate > dateApi.maxDate ) {
                    return dateApi.maxDate;
                }
            } else {
                /**
                 * Deal with time only. Set to 'epoch' and then set hours/mins/secs
                 * @private
                 */
                defaultDate = new Date( 0 );

                defaultDate.setHours( 0 );
                defaultDate.setMinutes( 0 );
                defaultDate.setSeconds( 0 );

                if( dateApi.minDate ) {
                    limitDate = new Date( 0 );

                    var jsMinDate = exports.getJSDate( dateApi.minDate );

                    limitDate.setHours( jsMinDate.getHours() );
                    limitDate.setMinutes( jsMinDate.getMinutes() );
                    limitDate.setSeconds( jsMinDate.getSeconds() );

                    if( defaultDate < limitDate ) {
                        return limitDate;
                    }
                }

                if( dateApi.maxDate ) {
                    limitDate = new Date( 0 );

                    var jsMaxDate = exports.getJSDate( dateApi.maxDate );

                    limitDate.setHours( jsMaxDate.getHours() );
                    limitDate.getMinutes( jsMaxDate.getMinutes() );
                    limitDate.setSeconds( jsMaxDate.getSeconds() );

                    if( defaultDate > limitDate ) {
                        return limitDate;
                    }
                }
            }
        } else {
            if( dateApi.isDateEnabled ) {
                /**
                 * Deal with date only. Set to hours/mins/secs to midnight local time.
                 *
                 * @private
                 */
                defaultDate = new Date();

                defaultDate.setHours( 0 );
                defaultDate.setMinutes( 0 );
                defaultDate.setSeconds( 0 );

                if( dateApi.minDate ) {
                    limitDate = exports.getJSDate( dateApi.minDate );
                    limitDate.setHours( 0 );
                    limitDate.setMinutes( 0 );
                    limitDate.setSeconds( 0 );

                    if( defaultDate < limitDate ) {
                        return limitDate;
                    }
                }

                if( dateApi.maxDate ) {
                    limitDate = exports.getJSDate( dateApi.maxDate );
                    limitDate.setHours( 0 );
                    limitDate.setMinutes( 0 );
                    limitDate.setSeconds( 0 );

                    if( defaultDate > limitDate ) {
                        return limitDate;
                    }
                }
            } else {
                defaultDate = exports.getNullDate();
            }
        }

        return defaultDate;
    };

    /**
     * @return {String} AngularJS $filter format to display a date & time entry in.
     * @ignore
     */
    exports.getEnglishDateTimeFormat = function() {
        return _englishDateTimeFormat.dateFilterFormat;
    };

    /**
     * @return {String} AngularJS $filter format to display a date entry in.
     * @ignore
     */
    exports.getEnglishDateFormat = function() {
        return _englishDateFormat.dateFilterFormat;
    };

    /**
     * @return {String} AngularJS $filter format to display a time entry in.
     * @ignore
     */
    exports.getEnglishTimeFormat = function() {
        return _englishTimeFormat.dateFilterFormat;
    };

    /**
     * @return {Date} The cached Date object set with the same date/time as the special 'epoch' or '1-Jan-1970 00:00:00
     *         GMT' value.
     * @ignore
     */
    exports.getEpochDate = function() {
        return _epochDate;
    };

    /**
     * @param {Number} timeValue - Milliseconds since unix 'epoch'.
     *
     * @returns {Date} The given string value converted into a time on 'January 1, 0001' (or NULL if the string contains
     *          an invalid time format).
     */
    exports.getDateFromTimeValue = function( timeValue ) {
        if( !timeValue ) {
            return exports.getNullDate();
        }

        var trim = timeValue.trim();

        /**
         * Remove any trailing ':' before trying to match the pattern
         */
        if( trim.length > 0 && trim.charAt( trim.length - 1 ) === ':' ) {
            trim = trim.substring( 0, trim.length - 1 );
        }

        var pattern = _dateTimeLocaleInfo.is12HrFormat ? _getTimePattern12Hr() : _getTimePattern24Hr();

        var matches = trim.match( pattern );

        // _logMatches(pattern, matches, trim);

        if( matches ) {
            var fields = {};

            if( _dateTimeLocaleInfo.is12HrFormat ) {
                if( matches[ 1 ] ) {
                    fields.disp = matches[ 1 ];
                    fields.hr = matches[ 2 ];
                    fields.min = matches[ 3 ];
                    fields.sec = matches[ 4 ];
                    fields.mer = matches[ 5 ];
                } else if( matches[ 6 ] ) {
                    fields.disp = matches[ 6 ];
                    fields.hr = matches[ 7 ];
                    fields.min = matches[ 8 ];
                    fields.mer = matches[ 9 ];
                    fields.sec = '0';
                } else if( matches[ 10 ] ) {
                    fields.disp = matches[ 10 ];
                    fields.hr = matches[ 11 ];
                    fields.min = '0';
                    fields.sec = '0';
                    fields.mer = matches[ 12 ];
                }

                /**
                 * If no meridiem, assume PM
                 */
                if( !fields.mer ) {
                    fields.mer = _i18n_postMeridiem;
                }

                fields.mer = fields.mer.toLowerCase();

                if( fields.mer === _i18n_postMeridiem.toLowerCase() || fields.mer === 'p' || fields.mer === 'pm' ) {
                    fields.hr = parseInt( fields.hr, 10 ) + 12;

                    if( fields.hr >= 24 ) {
                        fields.hr = '0';
                    } else {
                        fields.hr = fields.hr.toString();
                    }
                }
            } else {
                if( matches[ 1 ] ) {
                    fields.disp = matches[ 1 ];
                    fields.hr = matches[ 2 ];
                    fields.min = matches[ 3 ];
                    fields.sec = matches[ 4 ];
                } else if( matches[ 5 ] ) {
                    fields.disp = matches[ 5 ];
                    fields.hr = matches[ 6 ];
                    fields.min = matches[ 7 ];
                    fields.sec = '0';
                } else if( matches[ 8 ] ) {
                    fields.disp = matches[ 0 ];
                    fields.hr = matches[ 8 ];
                    fields.min = '0';
                    fields.sec = '0';
                }
            }

            if( fields.hr ) {
                return new Date( '0001', 0, 1, fields.hr, fields.min, fields.sec );
            }
        }

        return null;
    };

    /**
     * Returns a new Date object based on the given Date object or value.
     * <P>
     * Note: This method handles some corner cases found in (at least) the Firefox browser. The 'null date' used in AW
     * did not always create a valid Date object.
     *
     * @param {Object} dateToTest - Object that MAY be a JS Date or MAY be the number of milliseconds since 'epoch'.
     *
     * @return {Date} A new JS Date object based on the given object (or 'null' date if no other JS date possible).
     * @ignore
     */
    exports.getJSDate = function( dateToTest ) {
        /**
         * D-24274: Date Array LOV fails to clear field<BR>
         * On Firefox, When the 'dateToTest' has the 'null' date value, the 'new Date()' constructor creates an invalid
         * Date object. This causes 'NaN' problems later when we try to get a formatted string from this invalid Date.
         * <P>
         * We check here for that case and create a date based on the 'null' date time value.
         */
        if( exports.isNullDate( dateToTest ) ) {
            return new Date( _getDateTime( _nullLocalDate ) );
        }

        var jsDate = null;

        try {
            jsDate = new Date( dateToTest );
        } finally {
            if( !jsDate ) {
                jsDate = new Date( _getDateTime( _nullLocalDate ) );
            }
        }

        return jsDate;
    };

    /**
     * @param {String} timeValue - String value to test.
     *
     * @returns {String} The given string value now cleaned of any invalid characters.
     * @ignore
     */
    exports.getNormalizedTimeValue = function( timeValue ) {
        var nDate = exports.getDateFromTimeValue( timeValue );

        if( nDate ) {
            return exports.formatTime( nDate );
        }

        return '';
    };

    /**
     * @return {Date} The cached Date object set with the same date/time as the special 'null' or 'not yet set' value.
     */
    exports.getNullDate = function() {
        return _nullLocalDate;
    };

    /**
     * @return {String} AngularJS $filter format to display a date & time entry in.
     */
    exports.getSessionDateTimeFormat = function() {
        return _dateTimeLocaleInfo.sessionDateTimeFormat;
    };

    /**
     * @return {String} AngularJS $filter format to display a date entry in.
     */
    exports.getSessionDateFormat = function() {
        return _dateTimeLocaleInfo.sessionDateFormat;
    };

    /**
     * @return {String} AngularJS $filter format to display a time entry in.
     */
    exports.getSessionTimeFormat = function() {
        return _dateTimeLocaleInfo.sessionTimeFormat;
    };

    /**
     * @return {String} AngularJS $filter format to display a time entry in.
     */
    exports.getTimeFilterFormat = function() {
        if( _dateTimeLocaleInfo.is12HrFormat ) {
            return 'hh:mm:ss a';
        }

        return 'HH:mm:ss';
    };

    /**
     * @return {String} AngularJS $filter format to display a time lovEntry in.
     * @ignore
     */
    exports.getTimeLovEntryFilterFormat = function() {
        if( _dateTimeLocaleInfo.is12HrFormat ) {
            return 'hh:mm a';
        }

        return 'HH:mm';
    };

    /**
     * @return {String} User oriented text used to indicate the required format of the time entry (i.e. "12:00 AM",
     *         "Hours:Minutes", etc.).
     */
    exports.getTimeFormatPlaceholder = function() {
        var timePlaceholder = _timePlaceholder;

        if( _dateTimeLocaleInfo.is12HrFormat ) {
            timePlaceholder = timePlaceholder.concat( ' ' + _i18n_anteMeridiem + '/' + _i18n_postMeridiem );
        }

        return timePlaceholder;
    };

    /**
     * @returns {LovEntry[]} current list of time slots.
     * @ignore
     */
    exports.getTimeLovEntries = function() {
        if( !_timeLovEntries ) {
            _timeLovEntries = _buildTimeLovEntries();
        }
        return _timeLovEntries;
    };

    /**
     * @param {Object} dateToTest - A {Number} or {Date} or any other object that its 'valueOf' will result in a
     *            {Number} that represents MS since UNIX epoch.
     *
     * @return {Boolean} TRUE if the given test object represents the same date/time as the special 'null' or 'not yet
     *         set' value.
     */
    exports.isNullDate = function( dateToTest ) {
        if( !dateToTest ) {
            return true;
        }

        var dateTime;

        if( _.isString( dateToTest ) ) {
            dateTime = dateToTest;
            return dateTime === _nullLocalDateString || dateTime === exports.NULLDATE;
        }

        if( _.isNumber( dateToTest ) ) {
            dateTime = dateToTest;
        } else {
            dateTime = _getDateTime( dateToTest );
        }

        return dateTime === _getDateTime( _nullLocalDate ) || dateTime === _nullGmtTime;
    };

    /**
     * @param {Date} date1 - 1st date to compare.
     *
     * @param {Date} date2 - 2nd date to compare.
     *
     * @return {Number} The value <code>0</code> if the 'date2' is equal to 'date1'; a value less than <code>0</code>
     *         if 'date1' is less than 'date2'; and a value greater than <code>0</code> if 'date1' is greater than
     *         'date2'.
     */
    exports.compare = function( date1, date2 ) {
        var date1Final = date1;

        // Note: Current dbValue could be a JavaUtil class from GWT
        if( date1Final && date1Final.constructor !== Date ) {
            date1Final = new Date( date1 );
        }

        if( exports.isNullDate( date1Final ) ) {
            if( date2 && !exports.isNullDate( date2 ) ) {
                return -1;
            }

            return 0;
        }

        if( exports.isNullDate( date2 ) ) {
            return 1;
        }

        var diff = _getDateTime( date1Final ) - _getDateTime( date2 );

        if( diff === 0 ) {
            return 0;
        }
        if( diff > 0 ) {
            return 1;
        }
        return -1;
    };

    /**
     * @param {String} timeString -
     *
     * @return {String} The input string normalized for display.
     */
    exports.normalizeTimeString = function( timeString ) {
        if( timeString && timeString !== '' ) {
            return exports.getNormalizedTimeValue( timeString );
        }

        return '';
    };

    /**
     * @param {Date} dateInput - Date Object to modify
     *
     * @param {String} timeString - Time string that has been 'normalized' in 'HH:mm:ss' (24hr) or 'hh:mm:ss a' (12hr)
     *            format.
     *
     * @return {Date} The input Date object modified and set with the given timeString input.
     */
    exports.setTimeIntoDateModel = function( dateInput, timeString ) {
        if( timeString && timeString !== '' ) {
            var time = _tokenizeTime( timeString );

            dateInput.setHours( time[ 0 ] );
            dateInput.setMinutes( time[ 1 ] );
            dateInput.setSeconds( time[ 2 ] );
        } else {
            dateInput.setHours( 0 );
            dateInput.setMinutes( 0 );
            dateInput.setSeconds( 0 );
        }

        return dateInput;
    };

    /**
     * Set the user session specific locale and date/time format.
     *
     * @param {String} pattern - String returned as the "DefaultDateFormat" parameter supplied by the server during
     *            login (e.g. "%d-%b-%Y %H:%M").
     *            <P>
     *            Note: This pattern is not directly compatible with the {@link DateTimeFormat} class and must be
     *            converted into a compatible string before it is used with that class.
     */
    exports.setSessionDateTimeFormat = function( pattern ) {
        // Test pattern for simulating a server with a 4-digit year, 2-digit month & 12hr time format and slightly different date pattern
        // Uncomment this line to use....Very handy *** do not delete ***
        // pattern = "%Y-%b-%d %I:%M:%S";
        //
        // Test pattern for simulating a server with a 2-digit month & year (in German placement order) and 24hr time format w/o/ seconds
        // Uncomment this line to use....Very handy *** do not delete ***
        // pattern = "%d.%m.%y %H:%M";
        //
        // Test pattern for simulating a server with a full month, day & 4-digit year and no time format
        // Uncomment this line to use....Very handy *** do not delete ***
        // pattern = "%B %d, %Y";
        //
        // Test pattern for simulating a server with a 2-digit month & year (in English placement order) and 24hr time format w/o/ seconds
        // Uncomment this line to use....Very handy *** do not delete ***
        // pattern = "%m-%d-%Y %H:%M";

        var patternDateTime = _getDateFormatByServerString( pattern, true, true );
        var patternDate = _getDateFormatByServerString( pattern, true, false );
        var patternTime = _getDateFormatByServerString( pattern, false, true );

        _dateTimeLocaleInfo.sessionDateTimeFormat = patternDateTime.dateFilterFormat;
        _dateTimeLocaleInfo.sessionDateFormat = patternDate.dateFilterFormat;
        _dateTimeLocaleInfo.sessionTimeFormat = patternTime.dateFilterFormat;

        _dateFilterFormat = patternDate.dateFilterFormat;
        _datePickerFormat = patternDate.datePickerFormat;

        _datePlaceholder = patternDate.datePlaceholder;
        _timePlaceholder = patternTime.timePlaceholder;

        _showMonthAfterYear = patternDate.monthAfterYear;

        eventBus.publish( 'dateTime.sessionChanged', _dateTimeLocaleInfo );
    };

    /**
     * Definition for the 'dateTimeService' service used by several areas of the application.
     *
     * @memberof NgServices
     * @member dateTimeService
     */
    app.factory( 'dateTimeService', [
        '$filter', '$locale', 'localeService',
        function( $filter, $locale, localeSvc ) {
            _$filter = $filter;
            _$locale = $locale;
            _localeSvc = localeSvc;

            _nullLocalDateString = _$filter( 'date' )( _nullLocalDate, "yyyy-MM-dd'T'HH:mm:ssZ" );

            /**
             * Set locale and a default format now that the 'localeService' is valid.
             */
            exports.setSessionDateTimeFormat( '%d-%b-%Y %H:%M' );

            /**
             * Now that we have the localService, use its current value to init dateTime stuff.
             */
            _setupDateTimeLocaleInfo();

            /**
             * Setup to listen to changes in locale.
             *
             * @param {String} locale - String with the updated locale value.
             */
            eventBus.subscribe( 'locale.changed', function() {
                _setupDateTimeLocaleInfo();
            }, 'dateTimeService' );

            return exports;
        }
    ] );

    /**
     * Since this module can be loaded GWT-side by the ModuleLoader class we need to return an object indicating
     * which service should be injected to provide the API for this module.
     */
    return {
        moduleServiceNameToInject: 'dateTimeService'
    };
} );
