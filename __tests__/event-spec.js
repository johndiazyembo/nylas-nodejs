import NylasConnection from '../src/nylas-connection';
import Event from '../src/models/event';
import EventConferencing from '../src/models/event-conferencing';
import Nylas from '../src/nylas';
import fetch from 'node-fetch';
import When from '../src/models/when';
import EventParticipant from '../src/models/event-participant';
import { ICSMethod } from '../src/models/event';
import { EventReminder } from '../src/models/event-reminder-method';

jest.mock('node-fetch', () => {
  const { Request, Response } = jest.requireActual('node-fetch');
  const fetch = jest.fn();
  fetch.Request = Request;
  fetch.Response = Response;
  return fetch;
});

describe('Event', () => {
  let testContext;

  beforeEach(() => {
    Nylas.config({
      clientId: 'myClientId',
      clientSecret: 'myClientSecret',
      apiServer: 'https://api.nylas.com',
    });
    testContext = {};
    testContext.connection = new NylasConnection('123', { clientId: 'foo' });
    jest.spyOn(testContext.connection, 'request');

    const response = receivedBody => {
      return {
        status: 200,
        text: () => {
          return Promise.resolve(receivedBody);
        },
        buffer: () => {
          return Promise.resolve('body');
        },
        json: () => {
          return Promise.resolve(receivedBody);
        },
        headers: new Map(),
      };
    };

    fetch.mockImplementation(req => Promise.resolve(response(req.body)));

    testContext.event = new Event(testContext.connection);
  });

  describe('save', () => {
    test('should do a POST request if the event has no id', done => {
      testContext.event.id = undefined;
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {},
          participants: [],
          notifications: undefined,
        });
        done();
      });
    });

    test('should do a PUT request if the event has an id', done => {
      testContext.event.id = 'id-1234';
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual(
          'https://api.nylas.com/events/id-1234'
        );
        expect(options.method).toEqual('PUT');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {},
          participants: [],
          notifications: undefined,
        });
        done();
      });
    });

    test('should include params in the request if they were passed in', done => {
      return testContext.event.save({ notify_participants: true }).then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.qs['notify_participants']).toEqual(true);
        expect(options.url.toString()).toEqual(
          'https://api.nylas.com/events?notify_participants=true'
        );
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {},
          participants: [],
          notifications: undefined,
        });
        done();
      });
    });

    test('should create recurring event if recurrence is defined', done => {
      const recurrence = {
        rrule: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
        timezone: 'America/New_York',
      };
      testContext.event.recurrence = recurrence;
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {},
          participants: [],
          notifications: undefined,
          recurrence: recurrence,
        });
        done();
      });
    });

    test('should create event with time when start and end are the same UNIX timestamp', done => {
      testContext.event.when = new When();
      testContext.event.start = 1408875644;
      testContext.event.end = 1408875644;
      testContext.event.when.object = 'timespan';
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            time: 1408875644,
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        done();
      });
    });

    test('should create event with start_time and end_time when start and end are different UNIX timestamps', done => {
      testContext.event.start = 1409594400;
      testContext.event.end = 1409598000;
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            start_time: 1409594400,
            end_time: 1409598000,
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        done();
      });
    });

    test('should create event with date when start and end are same ISO date', done => {
      testContext.event.start = '1912-06-23';
      testContext.event.end = '1912-06-23';
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            date: '1912-06-23',
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        done();
      });
    });

    test('should create event with start_date and end_date when start and end are different ISO date', done => {
      testContext.event.start = '1815-12-10';
      testContext.event.end = '1852-11-27';
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            start_date: '1815-12-10',
            end_date: '1852-11-27',
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
        });
        done();
      });
    });

    test('should create event with time when event param `when` is updated with time', done => {
      testContext.event.when = { time: 1408875644 };
      return testContext.event.save().then(event => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            time: 1408875644,
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        expect(event.start).toBe(1408875644);
        expect(event.end).toBe(1408875644);
        done();
      });
    });

    test('should create event with start_time and end_time when event param `when` is updated with start_time and end_time', done => {
      testContext.event.when = new When({
        startTime: 1409594400,
        endTime: 1409598000,
      });
      return testContext.event.save().then(event => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            start_time: 1409594400,
            end_time: 1409598000,
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        expect(event.start).toBe(1409594400);
        expect(event.end).toBe(1409598000);
        done();
      });
    });

    test('should create event with date when the event param `when` is updated with date', done => {
      testContext.event.when = new When();
      testContext.event.when.date = '1912-06-23';
      return testContext.event.save().then(event => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            date: '1912-06-23',
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        expect(event.start).toBe('1912-06-23');
        expect(event.end).toBe('1912-06-23');
        done();
      });
    });

    test('should create event with start_date and end_date when the event param `when` is updated with start_date and end_date', done => {
      testContext.event.when = new When({
        startDate: '1815-12-10',
        endDate: '1852-11-27',
      });
      return testContext.event.save().then(event => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            start_date: '1815-12-10',
            end_date: '1852-11-27',
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        expect(event.start).toBe('1815-12-10');
        expect(event.end).toBe('1852-11-27');
        done();
      });
    });

    test('setting event.start should create event.when if it does does not exist', done => {
      delete testContext.event.when;
      testContext.event.start = '1815-12-10';
      testContext.event.end = '1852-11-27';
      expect(testContext.event.when.toJSON()).toEqual({
        start_date: '1815-12-10',
        end_date: '1852-11-27',
      });
      return testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          message_id: undefined,
          busy: undefined,
          title: undefined,
          description: undefined,
          owner: undefined,
          location: undefined,
          when: {
            start_date: '1815-12-10',
            end_date: '1852-11-27',
          },
          participants: [],
          notifications: undefined,
          read_only: undefined,
          status: undefined,
        });
        done();
      });
    });

    test('should create an event with a metadata object', done => {
      testContext.event.metadata = { hello: 'world' };
      testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {},
          participants: [],
          notifications: undefined,
          metadata: { hello: 'world' },
        });
        done();
      });
    });

    test('should add reminder method and minutes if defined', done => {
      testContext.event.reminderMinutes = '[20]';
      testContext.event.reminderMethod = 'popup';
      testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual('https://api.nylas.com/events');
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {},
          participants: [],
          notifications: undefined,
          reminder_method: 'popup',
          reminder_minutes: '[20]',
        });
        done();
      });
    });

    test('should not serialize reminder object is defined', done => {
      testContext.event.reminders = new EventReminder({
        reminderMinutes: '[20]',
        reminderMethod: 'popup',
      });
      testContext.event.id = 'reminder123';

      testContext.event.save().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual(
          'https://api.nylas.com/events/reminder123'
        );
        expect(options.method).toEqual('PUT');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: '',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {},
          participants: [],
          notifications: undefined,
          reminder_method: undefined,
          reminder_minutes: undefined,
        });
        done();
      });
    });

    describe('conferencing', () => {
      test('should create an event with conferencing details', done => {
        testContext.event.conferencing = new EventConferencing({
          provider: 'Zoom Meeting',
          details: {
            url: 'https://us02web.zoom.us/j/****************',
            meetingCode: '213',
            password: 'xyz',
            phone: ['+11234567890'],
          },
        });
        testContext.event.save().then(() => {
          const options = testContext.connection.request.mock.calls[0][0];
          expect(options.url.toString()).toEqual(
            'https://api.nylas.com/events'
          );
          expect(options.method).toEqual('POST');
          expect(JSON.parse(options.body)).toEqual({
            calendar_id: '',
            busy: undefined,
            title: undefined,
            description: undefined,
            location: undefined,
            when: {},
            _start: undefined,
            _end: undefined,
            participants: [],
            notifications: undefined,
            conferencing: {
              provider: 'Zoom Meeting',
              details: {
                url: 'https://us02web.zoom.us/j/****************',
                meeting_code: '213',
                password: 'xyz',
                phone: ['+11234567890'],
              },
            },
          });
          done();
        });
      });

      test('should create an event with conferencing autocreate set', done => {
        testContext.event.conferencing = new EventConferencing({
          provider: 'Zoom Meeting',
          autocreate: {
            settings: {
              password: '1234',
            },
          },
        });
        testContext.event.save().then(() => {
          const options = testContext.connection.request.mock.calls[0][0];
          expect(options.url.toString()).toEqual(
            'https://api.nylas.com/events'
          );
          expect(options.method).toEqual('POST');
          expect(JSON.parse(options.body)).toEqual({
            calendar_id: '',
            busy: undefined,
            title: undefined,
            description: undefined,
            location: undefined,
            when: {},
            participants: [],
            notifications: undefined,
            conferencing: {
              provider: 'Zoom Meeting',
              autocreate: {
                settings: {
                  password: '1234',
                },
              },
            },
          });
          done();
        });
      });
    });

    describe('notification', () => {
      test('should create an event with notifications', done => {
        const notificationEvent = testContext.event.fromJSON({
          notifications: [
            {
              body: 'Reminding you about our meeting.',
              minutes_before_event: 600,
              subject: 'Test Event Notification',
              type: 'email',
            },
            {
              type: 'webhook',
              minutes_before_event: 600,
              url:
                'https://hooks.service.com/services/T01A03EEXDE/B01TBNH532R/HubIZu1zog4oYdFqQ8VUcuiW',
              payload: JSON.stringify({
                text: 'Your reminder goes here!',
              }),
            },
            {
              type: 'sms',
              minutes_before_event: 60,
              message: 'Test Event Notification',
            },
          ],
        });

        expect(notificationEvent.notifications.length).toBe(3);
        expect(notificationEvent.notifications[0].body).toEqual(
          'Reminding you about our meeting.'
        );
        expect(notificationEvent.notifications[0].minutesBeforeEvent).toBe(600);
        expect(notificationEvent.notifications[0].subject).toEqual(
          'Test Event Notification'
        );
        expect(notificationEvent.notifications[0].type).toEqual('email');
        expect(notificationEvent.notifications[1].type).toEqual('webhook');
        expect(notificationEvent.notifications[1].minutesBeforeEvent).toBe(600);
        expect(notificationEvent.notifications[1].url).toEqual(
          'https://hooks.service.com/services/T01A03EEXDE/B01TBNH532R/HubIZu1zog4oYdFqQ8VUcuiW'
        );
        expect(notificationEvent.notifications[1].payload).toEqual(
          '{"text":"Your reminder goes here!"}'
        );
        expect(notificationEvent.notifications[2].type).toEqual('sms');
        expect(notificationEvent.notifications[2].minutesBeforeEvent).toBe(60);
        expect(notificationEvent.notifications[2].message).toEqual(
          'Test Event Notification'
        );

        notificationEvent.save().then(() => {
          const options = testContext.connection.request.mock.calls[0][0];
          expect(options.url.toString()).toEqual(
            'https://api.nylas.com/events'
          );
          expect(options.method).toEqual('POST');
          expect(JSON.parse(options.body)).toEqual({
            calendar_id: '',
            busy: undefined,
            title: undefined,
            description: undefined,
            location: undefined,
            when: {},
            _start: undefined,
            _end: undefined,
            participants: [],
            conferencing: undefined,
            notifications: [
              {
                body: 'Reminding you about our meeting.',
                minutes_before_event: 600,
                subject: 'Test Event Notification',
                type: 'email',
              },
              {
                minutes_before_event: 600,
                payload: '{"text":"Your reminder goes here!"}',
                type: 'webhook',
                url:
                  'https://hooks.service.com/services/T01A03EEXDE/B01TBNH532R/HubIZu1zog4oYdFqQ8VUcuiW',
              },
              {
                message: 'Test Event Notification',
                minutes_before_event: 60,
                type: 'sms',
              },
            ],
          });
          done();
        });
      });

      test('setting empty notifications array should send empty array', done => {
        testContext.event.notifications = [];

        testContext.event.save().then(() => {
          const options = testContext.connection.request.mock.calls[0][0];
          expect(options.url.toString()).toEqual(
            'https://api.nylas.com/events'
          );
          expect(options.method).toEqual('POST');
          expect(JSON.parse(options.body)).toEqual({
            calendar_id: '',
            busy: undefined,
            title: undefined,
            description: undefined,
            location: undefined,
            when: {},
            _start: undefined,
            _end: undefined,
            participants: [],
            conferencing: undefined,
            notifications: [],
          });
          done();
        });
      });

      test('not setting notifications should not send notifications in json', done => {
        testContext.event.notifications = undefined;

        testContext.event.save().then(() => {
          const options = testContext.connection.request.mock.calls[0][0];
          expect(options.url.toString()).toEqual(
            'https://api.nylas.com/events'
          );
          expect(options.method).toEqual('POST');
          expect('notifications' in JSON.parse(options.body)).toBe(false);
          done();
        });
      });
    });

    describe('when the request succeeds', () => {
      beforeEach(() => {
        testContext.connection.request = jest.fn(() => {
          const eventJSON = {
            id: 'id-1234',
            title: 'test event',
            when: { time: 1409594400, object: 'time' },
            participants: [
              {
                name: 'foo',
                email: 'bar',
                status: 'noreply',
                comment: 'This is a comment',
                phone_number: '416-000-0000',
              },
            ],
            ical_uid: 'id-5678',
            master_event_id: 'master-1234',
            original_start_time: 1409592400,
            event_collection_id: 100,
            capacity: 4,
            round_robin_order: ['test@email.com'],
          };
          return Promise.resolve(eventJSON);
        });
      });

      test('should resolve with the event object', done => {
        return testContext.event.save().then(event => {
          expect(event.id).toBe('id-1234');
          expect(event.title).toBe('test event');
          expect(event.when.time).toEqual(1409594400);
          expect(event.when.object).toEqual('time');
          expect(event.iCalUID).toBe('id-5678');
          expect(event.masterEventId).toBe('master-1234');
          expect(event.eventCollectionId).toBe(100);
          expect(event.capacity).toBe(4);
          expect(event.roundRobinOrder[0]).toBe('test@email.com');
          expect(event.originalStartTime.toString()).toBe(
            new Date(1409592400 * 1000).toString()
          );
          const participant = event.participants[0];
          expect(participant.name).toEqual('foo');
          expect(participant.email).toEqual('bar');
          expect(participant.status).toEqual('noreply');
          expect(participant.comment).toEqual('This is a comment');
          expect(participant.phoneNumber).toEqual('416-000-0000');
          done();
        });
      });

      test('should call the callback with the event object', done => {
        return testContext.event.save((err, event) => {
          expect(err).toBe(null);
          expect(event.id).toBe('id-1234');
          expect(event.title).toBe('test event');
          done();
        });
      });

      test('should only send the status object within the participant object on create', done => {
        testContext.event.participants = [
          new EventParticipant({
            name: 'foo',
            email: 'bar',
            status: 'noreply',
            comment: 'This is a comment',
            phoneNumber: '416-000-0000',
          }),
        ];
        testContext.event.save().then(() => {
          const options = testContext.connection.request.mock.calls[0][0];
          expect(options.body).toEqual({
            calendar_id: '',
            when: {},
            participants: [
              {
                name: 'foo',
                email: 'bar',
                comment: 'This is a comment',
                phone_number: '416-000-0000',
                status: 'noreply',
              },
            ],
          });
        });
        testContext.event.id = 'abc-123';
        testContext.event.save().then(() => {
          const options = testContext.connection.request.mock.calls[1][0];
          expect(options.body).toEqual({
            calendar_id: '',
            when: {},
            participants: [
              {
                name: 'foo',
                email: 'bar',
                comment: 'This is a comment',
                phone_number: '416-000-0000',
                status: undefined,
              },
            ],
          });
          done();
        });
      });
    });

    describe('when the request fails', () => {
      beforeEach(() => {
        testContext.error = new Error('Network error');
        testContext.connection.request = jest.fn(() =>
          Promise.reject(testContext.error)
        );
      });

      test('should reject with the error', done => {
        testContext.event.save().catch(err => {
          expect(err).toBe(testContext.error);
          done();
        });
      });

      test('should call the callback with the error', done => {
        testContext.event
          .save((err, event) => {
            expect(err).toBe(testContext.error);
            expect(event).toBe(undefined);
            done();
          })
          .catch(() => {
            // do nothing
          });
      });
    });
  });

  describe('rsvp', () => {
    test('should do a POST request to the RSVP endpoint', done => {
      testContext.event.id = 'public_id';
      return testContext.event.rsvp('yes', 'I will come.').then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual(
          'https://api.nylas.com/send-rsvp'
        );
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          event_id: 'public_id',
          status: 'yes',
          comment: 'I will come.',
        });
        done();
      });
    });
  });

  describe('generateICS', () => {
    beforeEach(() => {
      const response = () => {
        return {
          status: 200,
          text: () => {
            return Promise.resolve(
              JSON.stringify({
                ics: 'ics_string',
              })
            );
          },
          buffer: () => {
            return Promise.resolve('body');
          },
          json: () => {
            return Promise.resolve({
              ics: 'ics_string',
            });
          },
          headers: new Map(),
        };
      };

      fetch.mockImplementation(() => Promise.resolve(response()));
    });

    test('should do a POST request to the /to-ics endpoint', done => {
      testContext.event.calendarId = 'calendar_id';
      testContext.event.when.date = '1912-06-23';
      return testContext.event.generateICS().then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual(
          'https://api.nylas.com/events/to-ics'
        );
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: 'calendar_id',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {
            date: '1912-06-23',
          },
          participants: [],
          notifications: undefined,
          ics_options: {},
        });
        done();
      });
    });

    test('should do a POST request to the /to-ics endpoint with options set', done => {
      testContext.event.calendarId = 'calendar_id';
      testContext.event.when.date = '1912-06-23';
      const icsOptions = {
        iCalUID: 'aaa',
        method: ICSMethod.Request,
        prodId: 'prodId',
      };

      return testContext.event.generateICS(icsOptions).then(() => {
        const options = testContext.connection.request.mock.calls[0][0];
        expect(options.url.toString()).toEqual(
          'https://api.nylas.com/events/to-ics'
        );
        expect(options.method).toEqual('POST');
        expect(JSON.parse(options.body)).toEqual({
          calendar_id: 'calendar_id',
          busy: undefined,
          title: undefined,
          description: undefined,
          location: undefined,
          when: {
            date: '1912-06-23',
          },
          participants: [],
          notifications: undefined,
          ics_options: {
            ical_uid: 'aaa',
            method: 'request',
            prodid: 'prodId',
          },
        });
        done();
      });
    });

    test('should do throw an error if calendar id is not set', done => {
      testContext.event.when.date = '1912-06-23';

      expect(() => testContext.event.generateICS()).toThrow();
      done();
    });

    test('should do throw an error if when is not properly set', done => {
      testContext.event.calendarId = 'calendar_id';

      expect(() => testContext.event.generateICS()).toThrow();
      done();
    });
  });

  describe('validation', () => {
    test('should throw exception if both conferencing details and autocreate are set', done => {
      testContext.event.conferencing = new EventConferencing({
        provider: 'Zoom Meeting',
        details: {
          url: 'https://us02web.zoom.us/j/****************',
          meeting_code: '213',
          password: 'xyz',
          phone: ['+11234567890'],
        },
        autocreate: {
          settings: {
            password: '1234',
          },
        },
      });
      expect(() => testContext.event.save()).toThrow(
        new Error(
          "Cannot set both 'details' and 'autocreate' in conferencing object."
        )
      );
      done();
    });

    test('should throw an error if capacity is less than the amount of participants', done => {
      testContext.event.capacity = 1;
      testContext.event.participants = [
        new EventParticipant({
          email: 'person1@email.com',
        }),
        new EventParticipant({
          email: 'person2@email.com',
        }),
      ];
      expect(() => testContext.event.save()).toThrow(
        new Error(
          'The number of participants in the event exceeds the set capacity.'
        )
      );
      done();
    });

    test('should not throw if capacity is -1', done => {
      testContext.event.capacity = -1;
      testContext.event.participants = [
        new EventParticipant({
          email: 'person1@email.com',
        }),
        new EventParticipant({
          email: 'person2@email.com',
        }),
      ];
      expect(() => testContext.event.save()).not.toThrow(
        new Error(
          'The number of participants in the event exceeds the set capacity.'
        )
      );
      done();
    });

    test('should not throw if capacity is set but participants are less than or equal to capacity', done => {
      testContext.event.capacity = 2;
      testContext.event.participants = [
        new EventParticipant({
          email: 'person1@email.com',
        }),
        new EventParticipant({
          email: 'person2@email.com',
        }),
      ];
      expect(() => testContext.event.save()).not.toThrow(
        new Error(
          'The number of participants in the event exceeds the set capacity.'
        )
      );
      testContext.event.capacity = 3;
      expect(() => testContext.event.save()).not.toThrow(
        new Error(
          'The number of participants in the event exceeds the set capacity.'
        )
      );
      done();
    });
  });
});
