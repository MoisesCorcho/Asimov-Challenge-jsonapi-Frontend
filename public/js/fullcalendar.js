// Estas variables se establecen aca arriba para poder tener
// acceso a ellas en todo el script
let loadingAppointments = true;
let calendar;

// Se crea una instancia de Axios y se le pasan parametros
// de configuracion
const appointmentApi = axios.create({
    baseURL: 'http://127.0.0.1:8001/api/v1',
    params: {
        "page[size]": 50,
        // "filter[date]": 2003
    },
    headers: {
        'Accept': 'application/vnd.api+json',
        'content-type':'application/vnd.api+json',
        'Authorization': "Bearer 13|sE1Fza1fQHJGvjqDyxaRtvgBdnkV1IdYJ0CznsRee3e9a99e"
    },
})

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        // initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listYear'
        },
        height: 650,
        dayMaxEventRows: true, // Only Show One Appointment per day.
        events: async () => await getAppointments(),
        eventClick: async function(info) {

            // The click event will start when we click on an Appointment
            await showAppointment(info.event.id);

            // change the border color just for fun
            info.el.style.borderColor = 'red';
        },
        dateClick: async function(info) {

            // The click event will start when we click on a date
            await createAppointment(info)
        },
        selectable: true
    });

    calendar.render();
});

/**
 * Crear una cita.
 *
 * @param {Object} info
 * @returns void
 */
async function createAppointment(info)
{
    let appointment = null;

    // Se crea la ventana modal para preguntar por la hora de la cita.
    let sweetAlertResponse = await new Swal({
        title: 'Choose the Appointment time',
        icon: 'question',
        input: 'time',
        showCancelButton: true
    });

    // Si el campo es "" significa que se quizo continuar sin elegir una hora.
    if (sweetAlertResponse.value === "" ) {
        Swal.fire({
            title: "You have to choice a time."
        })

        return
    }

    // En caso de que el usuario haya cerrado la ventana modal o haya presionado
    // la opcion de cancelar.
    if (sweetAlertResponse.isConfirmed === false) {
        return
    }

    // En caso de que se le haya dado en continuar en la ventana modal y que se haya
    // elegido una hora, se va a crear el objeto Appointment
    if (sweetAlertResponse.value !== "" && sweetAlertResponse.isConfirmed === true) {
        appointment = {
            date: info.dateStr,
            time: sweetAlertResponse.value,
            email: "statictestemail@gmail.com"
        };
    }

    // Se realiza la peticion POST mandando como parametro el objeto creado.
    let response = appointmentApi.post('/appointments', {
        data: {
            type: 'appointments',
            attributes: {
                date: appointment.date,
                start_time: appointment.time,
                email: appointment.email
            },
            relationships: {
                category: {
                    data: {
                        id: 14
                    }
                },
                author: {
                    data: {
                        id: "db8acb9c-e0f4-42ff-8727-804b029693d1"
                    }
                }
            }
        },

    })

    // Se espera a que se resuelva la peticion con 'await' y si todo sale bien
    // Se crea la cita, sino, se muestra el error
    try {
        await response;

        Swal.fire('Created', 'Appointment successfully created', 'success')

        // Se refrezca la obtencion de las citas desde la base de datos
        // solo despues de que haya pasado un segundo (1000)
        setTimeout(() => {
            calendar.refetchEvents();
        }, 1000)

    } catch (err) {
        let error = err.response.data.errors[0].detail

        // Se muestra el error en una ventana modal
        Swal.fire('Error', error, 'error')
    }
}

/**
 * Obtener las citas para que sean mostradas en el calendario.
 *
 * @returns array
 */
async function getAppointments()
{
    // La ventana de carga se mostrará solo la primera vez que se entre a esta ruta.
    if (loadingAppointments) {
        new Swal({
            title: 'Please, wait...',
            allowOutsideClick: false,
        })
        Swal.showLoading()

        loadingAppointments = false;
    }

    // Se hace la peticion GET
    let response = await appointmentApi.get('/appointments');

    // Cuando se haya resuelto la promesa cerramos la ventana SweetAlert de carga
    Swal.close();

    // Se define un arreglo donde se guardaran los eventos (Appointments)
    // que se mostraran en el calendario FullCalendar
    let events = [];

    // Se recorre el objeto con las citas y se llena el arreglo con los elementos.
    response.data.data.forEach(element => {
        events.push({
            id: element.id,
            title: element.attributes.email,
            start: element.attributes.date
        })
    });

    return events;
}

/**
 * Borrar un Appointment
 *
 * @param {string} id
 * @returns void
 */
async function deleteAppointment(id)
{
    // Se extrae la propiedad isConfirmed de la respuesta generada
    // al resolver la promesa de SweetAlert
    const { isConfirmed } = await Swal.fire({
        'title': 'Do you want to delete this Appointment?',
        'text': 'Once deleted, it cannot be recovered.',
        showDenyButton: true,
        confirmButtonText: 'Yes, Im sure'
    })

    //En caso de que se haya confirmado en la ventana SweetAlert
    if ( isConfirmed ) {

        // Se muestra una ventana de carga mientras se resuelve la peticion.
        new Swal({
            title: 'Please, wait...',
            allowOutsideClick: false
        })
        Swal.showLoading()

        try {
            // Se manda la peticion DELETE
            await appointmentApi.delete(`/appointments/${id}`);

            Swal.fire('Deleted', '', 'success')

            // Se refrezca la obtencion de las citas desde la base de datos
            // solo despues de que haya pasado un segundo (1000)
            setTimeout(() => {
                calendar.refetchEvents();
            }, 1000)

        } catch (err) {
            // Se captura el error y se muestra
            let error = err.response.data.errors[0].detail

            Swal.fire('Error', error, 'error')
        }

    }

}

/**
 * Obtener una Cita.
 *
 * @param {string} id
 * @returns void
 */
async function showAppointment(id)
{
    try {
        // Se muestra una ventana de carga mientras se resuelve la peticion.
        new Swal({
            title: 'Please, wait...',
            allowOutsideClick: false
        })
        Swal.showLoading()

        // Se hace la peticion GET + ID
        let response = await appointmentApi.get(`/appointments/${id}`);

        let attributes = '';

        // Se recorre el objeto con las citas de la base de datos
        for ( let clave in response.data.data.attributes ){
            attributes += response.data.data.attributes[clave] + '<br>'
        }

        // Sweet Alert puede funcionar con HTML
        let htmlContent = '<h4>' + attributes + '</h4>';

        // Se muestran los detalles de la cita.
        let { isConfirmed } = await new Swal({
            title: "Appointment's Information",
            html: htmlContent,
            showCancelButton: true,
            confirmButtonText: "Delete",
            cancelButtonText: "Exit",
        })

        // En caso de que se confirme la opcion de borrar se llama
        // a la funcion para eliminar Citas.
        if ( isConfirmed ) {
            await deleteAppointment(id)
        }

    } catch (err) {
        console.log(err);
        let error = err.response.data.errors[0].detail

        Swal.fire('Error', error, 'error')
    }
}


