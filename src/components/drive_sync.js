// Google Drive appDataFolder sync for the calendar JSON blob.
//
// Everything talks to Drive with `fetch` + `async/await` and passes the access
// token in the `Authorization` header (never in the query string, where it
// would leak into logs, proxies and browser history).

// Drive endpoints. The metadata/download API and the upload API live on
// different hosts.
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_FILES_URL =
  'https://www.googleapis.com/upload/drive/v3/files'

// Trailing debounce window for Drive writes. Every day-entry submit and every
// theme change asks for an upload; coalescing them keeps us well clear of the
// API quotas without the user noticing a delay.
const UPLOAD_DEBOUNCE_MS = 1500

// Log a failed HTTP response with enough context to debug it. Consumes the
// response body, so only call this on responses we are not going to read.
const log_http_error = async (context, response) => {
  var detail = ''
  try {
    detail = await response.text()
  } catch {
    detail = '<could not read response body>'
  }
  console.error(
    'Google Drive ' +
      context +
      ' failed: ' +
      response.status +
      ' ' +
      response.statusText +
      ' ' +
      detail
  )
}

class GoogleDriveAuth {
  constructor (on_auth_callback) {
    this.client_id =
      '132466932829-s6ml9k12mtjs01qa5gs5s0u6frll6ep1.apps.googleusercontent.com'
    this.scope = 'https://www.googleapis.com/auth/drive.appdata'
    this.on_auth_callback = on_auth_callback
    // The token client is created lazily. The GSI library is loaded with
    // `async`, so `google` may still be undefined while this class is being
    // constructed; touching it here would throw a ReferenceError and take the
    // rest of the app down with it. Nothing needs the client until we
    // actually open the consent popup, which only ever happens from a click.
    this.client = null
  }

  ensure_client = () => {
    // Return the GSI token client, creating it on first use. Returns null (and
    // logs) when the GSI script has not loaded — the caller is expected to
    // degrade gracefully rather than crash. Safe to retry: a later call after
    // the script finishes loading will succeed.
    if (this.client) {
      return this.client
    }

    if (
      typeof google === 'undefined' ||
      !google.accounts ||
      !google.accounts.oauth2
    ) {
      console.error(
        'Google Identity Services is not available; cannot sync with Google Drive'
      )
      return null
    }

    try {
      this.client = google.accounts.oauth2.initTokenClient({
        client_id: this.client_id,
        scope: this.scope,
        callback: this.auth_callback,
        error_callback: this.auth_error_callback
      })
    } catch (error) {
      console.error('Could not initialize the Google token client', error)
      return null
    }
    return this.client
  }

  auth_error_callback = error => {
    // Fired by GSI when the popup could not be opened or the user dismissed
    // it. No token, so whatever asked for one stays in its signed-out state.
    console.error('Google authorization did not complete', error)
  }

  auth_callback = response => {
    if (response && response.access_token) {
      // https://developers.google.com/identity/oauth2/web/reference/js-reference

      // Pull the access token and the expiration time from the response and save them to localSession
      this.access_token = response.access_token
      localStorage['access_token'] = response.access_token
      var expiration_date = new Date()
      expiration_date.setSeconds(
        expiration_date.getSeconds() + Number(response.expires_in)
      )
      localStorage['access_token_expiration'] = expiration_date

      // Call the authorization success callback
      this.on_auth_callback(this.access_token)
    } else {
      console.error('Bad response from the Google token client', response)
    }
  }

  check_if_authorized = () => {
    // Try pulling the token and expiration time from localStorage
    const local_access_token = localStorage.getItem('access_token')
    const expiration_timestamp = localStorage.getItem('access_token_expiration')

    if (local_access_token && expiration_timestamp) {
      if (new Date(expiration_timestamp) > new Date()) {
        // If both exist and the token hasn't expired, set the current token from the one in localSession storage
        this.access_token = local_access_token
        return true
      }
      console.log('Token Expired')
    }
    return false
  }

  request_silent_auth = () => {
    // The half of `request_auth` that is safe to run without a user gesture:
    // reuse a cached, unexpired token and fire the success callback with it.
    // Returns false when there is nothing usable cached, in which case the
    // caller must get a user gesture before calling `request_auth`.
    if (!this.check_if_authorized()) {
      return false
    }
    // console.log('Already Authorized')
    if (this.on_auth_callback) {
      // Call the authorization success callback
      this.on_auth_callback(this.access_token)
    }
    return true
  }

  request_auth = () => {
    // Authorize, opening the Google consent popup if needed. Because of that
    // popup this must be called from a user gesture (a click); browsers block
    // popups opened from page load. Returns true if a cached token was reused
    // or the popup was successfully opened — success of the popup flow itself
    // is reported later, through the auth callback.
    if (this.request_silent_auth()) {
      return true
    }

    const client = this.ensure_client()
    if (!client) {
      return false
    }

    // Try to get authentication
    try {
      client.requestAccessToken()
      return true
    } catch (error) {
      // TODO: popup that says that you can't sync to drive
      console.error('Could not authenticate', error)
      return false
    }
  }
}

class GoogleDriveCalendarFileHandler {
  constructor (calendar_data) {
    this.json_file_name = 'calendar.json'
    this.file_id = ''
    this.calendar_data = calendar_data
    this.redraw = () => {}

    // Debounced-upload state. `pending_json_string` holds the newest string we
    // have been handed but not yet written; the timer is re-armed on every new
    // save so only the last one in a burst reaches the network.
    this.pending_json_string = null
    this.upload_timer = null
    this.upload_in_flight = false
    // Resolves once the initial "does calendar.json already exist?" lookup has
    // finished. Uploads wait on it so a save made right after page load can't
    // create a duplicate file while the lookup is still in flight.
    this.file_lookup_promise = null
  }

  set_redraw = f => {
    this.redraw = f
  }

  auth_callback = access_token => {
    // set the access token and try to pull the calendar data from google drive
    this.access_token = access_token
    this.check_for_file()
  }

  auth_headers = () => {
    return { Authorization: 'Bearer ' + this.access_token }
  }

  download_calendar_file = async file_id => {
    // Download the file with the given id and load it into the calendar.
    try {
      const response = await fetch(
        DRIVE_FILES_URL + '/' + encodeURIComponent(file_id) + '?alt=media',
        { method: 'GET', headers: this.auth_headers() }
      )

      if (!response.ok) {
        await log_http_error('download of file ' + file_id, response)
        return false
      }

      // Attempt to initialize the calendar object from the downloaded JSON data.
      const json_string = await response.text()
      if (this.calendar_data.initialize_from_jsons(json_string)) {
        this.redraw()
        return true
      }
      console.error(
        'Google Drive file ' + file_id + ' did not contain valid calendar data'
      )
      return false
    } catch (error) {
      console.error(
        'Google Drive download of file ' + file_id + ' failed',
        error
      )
      return false
    }
  }

  check_for_file = () => {
    // Check if the calendar data file exists on google drive. The promise is
    // kept so that pending uploads can wait for the answer before deciding
    // whether to create a new file.
    this.file_lookup_promise = this.find_calendar_file()
    return this.file_lookup_promise
  }

  find_calendar_file = async () => {
    // List the app folder, keep the first calendar.json we find and clean out
    // everything else. This never rejects: uploads await it.
    try {
      const response = await fetch(
        DRIVE_FILES_URL + '?spaces=appDataFolder&fields=files(id,name)',
        { method: 'GET', headers: this.auth_headers() }
      )

      if (!response.ok) {
        await log_http_error('file listing', response)
        return
      }

      const file_response = await response.json()
      const files = file_response['files'] || []
      var found_calendar_file = false
      var stale_deletes = []

      // Pull the file list, and iterate over them until we find the one matching the name of the calendar data file
      for (const file of files) {
        if (file['name'] === this.json_file_name && !found_calendar_file) {
          this.file_id = file['id']
          found_calendar_file = true
        } else {
          // There is currently no reason that we should have other files in this webapp's gDrive folder
          // so we clean it out while looking for the right file.
          stale_deletes.push(this.delete_file(file['id']))
        }
      }

      if (found_calendar_file) {
        await this.found_file()
      }
      await Promise.all(stale_deletes)
    } catch (error) {
      console.error('Google Drive file listing failed', error)
    }
  }

  found_file = async () => {
    // Download the file at the current set file_id
    console.log('Found data file on Google Drive')
    return this.download_calendar_file(this.file_id)
  }

  upload_json_string_to_file = string => {
    // Queue the passed string to be written to google drive as the calendar
    // data file. Synchronous by design: callers just fire and forget, and the
    // actual network write happens once the debounce timer expires with the
    // most recent string we were handed.
    if (!this.access_token) {
      console.error('Cannot sync to Google Drive: no access token')
      return false
    }

    this.pending_json_string = string
    if (this.upload_timer !== null) {
      clearTimeout(this.upload_timer)
    }
    this.upload_timer = setTimeout(this.flush_pending_upload, UPLOAD_DEBOUNCE_MS)
    return true
  }

  flush_pending_upload = () => {
    this.upload_timer = null
    if (this.pending_json_string === null) {
      return
    }

    if (this.upload_in_flight) {
      // An earlier write is still going. Re-arm rather than racing it, so the
      // newest data is always written last.
      this.upload_timer = setTimeout(
        this.flush_pending_upload,
        UPLOAD_DEBOUNCE_MS
      )
      return
    }

    // Claim the pending string. Anything saved from here on lands in a fresh
    // pending string and gets its own timer.
    const string = this.pending_json_string
    this.pending_json_string = null
    this.upload_in_flight = true

    this.write_json_string(string)
      .catch(error => {
        // write_json_string handles its own errors; this is the last line of
        // defence against an unhandled rejection.
        console.error('Google Drive upload failed unexpectedly', error)
      })
      .finally(() => {
        this.upload_in_flight = false
      })
  }

  write_json_string = async string => {
    // Write the string to Drive, preferring an in-place update of the file we
    // already know about. A new file is only created when we have nowhere to
    // write, and the old file is only removed once the new one exists, so a
    // failed write never leaves the user without a backup.
    if (!this.access_token) {
      console.error('Cannot sync to Google Drive: no access token')
      return false
    }

    // Wait for the initial lookup so we don't create a second calendar.json
    // while the listing that would have told us the existing id is in flight.
    if (this.file_lookup_promise) {
      await this.file_lookup_promise
    }

    const previous_file_id = this.file_id
    if (previous_file_id) {
      if (await this.update_file_contents(previous_file_id, string)) {
        return true
      }
      // The update failed (file deleted elsewhere, token trouble, ...). Fall
      // through and try to create a fresh file instead of giving up.
      console.error(
        'Google Drive update of file ' +
          previous_file_id +
          ' failed, creating a new file instead'
      )
    }

    const new_file_id = await this.create_file(string)
    if (!new_file_id) {
      // Nothing was written, but the old file (if any) is still intact and
      // this.file_id still points at it.
      return false
    }

    this.file_id = new_file_id
    if (previous_file_id && previous_file_id !== new_file_id) {
      // Only now that the replacement exists is it safe to drop the old file.
      await this.delete_file(previous_file_id)
    }
    return true
  }

  update_file_contents = async (file_id, string) => {
    // Media upload: replaces the file's contents and keeps its metadata.
    // https://developers.google.com/drive/api/guides/manage-uploads
    try {
      const response = await fetch(
        DRIVE_UPLOAD_FILES_URL +
          '/' +
          encodeURIComponent(file_id) +
          '?uploadType=media&fields=id',
        {
          method: 'PATCH',
          headers: {
            ...this.auth_headers(),
            'Content-Type': 'application/json'
          },
          body: string
        }
      )

      if (!response.ok) {
        await log_http_error('update of file ' + file_id, response)
        return false
      }
      return true
    } catch (error) {
      console.error('Google Drive update of file ' + file_id + ' failed', error)
      return false
    }
  }

  create_file = async string => {
    // Multipart create: metadata + contents in one request. Returns the new
    // file id, or an empty string if the file could not be created.
    const metadata = {
      name: this.json_file_name, // Filename on Google Drive
      mimeType: 'application/json', // mimeType on Google Drive
      parents: ['appDataFolder'] // Folder ID on Google Drive
    }
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    )
    form.append('file', new Blob([string], { type: 'application/json' }))

    try {
      // Content-Type is left to the browser so it can add the multipart boundary.
      const response = await fetch(
        DRIVE_UPLOAD_FILES_URL + '?uploadType=multipart&fields=id',
        { method: 'POST', headers: this.auth_headers(), body: form }
      )

      if (!response.ok) {
        await log_http_error('creation of ' + this.json_file_name, response)
        return ''
      }

      const created = await response.json()
      if (!created || !created.id) {
        console.error(
          'Google Drive creation of ' +
            this.json_file_name +
            ' returned no file id',
          created
        )
        return ''
      }
      return created.id
    } catch (error) {
      console.error(
        'Google Drive creation of ' + this.json_file_name + ' failed',
        error
      )
      return ''
    }
  }

  delete_file = async file_id => {
    // Delete the file with the given file_id. A 404 means it is already gone,
    // which is exactly the state we wanted.
    try {
      const response = await fetch(
        DRIVE_FILES_URL + '/' + encodeURIComponent(file_id),
        { method: 'DELETE', headers: this.auth_headers() }
      )

      if (!response.ok && response.status !== 404) {
        await log_http_error('delete of file ' + file_id, response)
        return false
      }
      // console.log('deleted: ' + file_id)
      return true
    } catch (error) {
      console.error('Google Drive delete of file ' + file_id + ' failed', error)
      return false
    }
  }
}

export { GoogleDriveAuth, GoogleDriveCalendarFileHandler }
