

let monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function createCalendar(year, month) {
    let mon = month; // месяцы в JS идут от 0 до 11, а не от 1 до 12
    let d = new Date(year, mon);
    // пробелы для первого ряда
    // с понедельника до первого дня месяца
    // * * * 1  2  3  4
    calendarJSON =
        {
            'reply_markup': {
                'inline_keyboard': [
                    [
                        {text: '<', callback_data: 'last_month_btn'},
                        {
                            text: monthName[calendarDay.getMonth()] + calendarDay.getFullYear().toString(),
                            callback_data: 'select_btn'
                        },
                        {text: '>', callback_data: 'next_month_btn'}
                    ],

                    [
                        {text: 'S', callback_data: 'week_day'},
                        {text: 'M', callback_data: 'week_day'},
                        {text: 'T', callback_data: 'week_day'},
                        {text: 'W', callback_data: 'week_day'},
                        {text: 'T', callback_data: 'week_day'},
                        {text: 'F', callback_data: 'week_day'},
                        {text: 'S', callback_data: 'week_day'}
                    ],
                    [],
                    [],
                    [],
                    [],
                    [],
                    [],
                    []
                ]
            }
        };
    console.log(calendarJSON);

    for (let i = 0; i < getDay(d); i++) {
        if (typeof (calendarJSON.reply_markup.inline_keyboard[3]) == 'undefined') {
            calendarJSON.reply_markup.inline_keyboard.push([]);
        }
        let obj = {text: ' ', callback_data: 'empty_field'};
        calendarJSON.reply_markup.inline_keyboard[3].push(obj);
        //reply_markup.inline_keyboard[0].push(obj);
    }

    // <td> ячейки календаря с датами
    let i = 3; //номер массива
    while (d.getMonth() == mon) {
        calendarJSON.reply_markup.inline_keyboard[i].push({
            text: d.getDate(),
            callback_data: 'date_field:' + d.getDate()
        });

        if (getDay(d) % 7 == 6) { // вс, последний день - перевод строки
            i++;
        }

        d.setDate(d.getDate() + 1);
    }

    // добить таблицу пустыми ячейками, если нужно
    // 29 30 31 * * * *
    if (getDay(d) != 0) {
        for (let i = getDay(d); i < 7; i++) {
            calendarJSON.reply_markup.inline_keyboard[7].push({text: ' ', callback_data: 'empty_field'});
        }
    }
}

function getDay(date) { // получить номер дня недели, от 0 (пн) до 6 (вс)
    let day = date.getDay();
    if (day == 0) {
        day = 7;
    } // сделать воскресенье (0) последним днем
    return day - 1;
}