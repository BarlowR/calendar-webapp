class GoogleDriveAuth {
    constructor(on_auth_callback){
        this.client_id = '132466932829-s6ml9k12mtjs01qa5gs5s0u6frll6ep1.apps.googleusercontent.com',
        this.scope = 'https://www.googleapis.com/auth/drive.appdata'
        this.on_auth_callback = on_auth_callback
        this.client = google.accounts.oauth2.initTokenClient({
            client_id : this.client_id,
            scope : this.scope,
            callback: this.auth_callback})
    }

    auth_callback = (respose) => {
        if (respose && respose.access_token) {
            // https://developers.google.com/identity/oauth2/web/reference/js-reference

            // Pull the access token and the expiration time from the response and save them to localSession
            this.access_token = respose.access_token
            localStorage["access_token"] = respose.access_token
            var expiration_date = new Date();
            expiration_date.setSeconds(expiration_date.getSeconds() + Number(respose.expires_in))
            localStorage["access_token_expiration"] = expiration_date;

            // Call the suthorization success callback
            this.on_auth_callback(this.access_token)
        } else {
            console.error("Bad response")
        }
    }


    check_if_authorized = () => {
        // Try pulling the token and expiration time from localStorage
        const local_access_token = localStorage.getItem("access_token")
        const expiration_timestamp = localStorage.getItem("access_token_expiration")
        
        if (local_access_token && expiration_timestamp){
            if (new Date(expiration_timestamp) > new Date()){
                // If both exist and the token hasn't expired, set the current token from the one in localSession storage
                this.access_token = local_access_token
                return true;
            }
            console.log("Token Expired")
        }
        return false
    }
    request_auth = () => {
        // Check if authorized.
        if (this.check_if_authorized()){
            console.log("Already Authorized")
            if (this.on_auth_callback){
                // Call the authorization success callback
                this.on_auth_callback(this.access_token)
            }
            return true;
        }

        // Try to get authentication
        try {
            this.client.requestAccessToken()
            return true
        } catch{
            // TODO: popup that says that you can't sync to drive
            console.error("Could not authenticate");
            return false
        }
    }
}

class GoogleDriveCalendarFileHandler{
    constructor(calendar_data){
        this.json_file_name = "calendar.json"
        this.file_id = ""
        this.calendar_data = calendar_data
        this.redraw = (() => {});
    }

    set_redraw = (f) => {
        this.redraw = f
    }

    auth_callback = (access_token) => {
        // set the access token and try to pull the calendar data from google drive
        this.access_token = access_token;
        this.check_for_file()
    }

    download_calendar_file = (file_id) => {
        // Sent a request to download a file with the given id
        var xhr = new XMLHttpRequest();
        xhr.open('GET',
            "https://www.googleapis.com/drive/v3/files/" + file_id + "?alt=media");
        xhr.setRequestHeader('Authorization', 'Bearer ' + this.access_token);
        
        xhr.onreadystatechange = (e) => {
            if (xhr.readyState == 4){
                if (xhr.status === 200) {
                    // Attempt to initialize the calendar object from the downloaded JSON data. 
                    if (this.calendar_data.initialize_from_jsons(xhr.response)){
                        this.redraw()
                    }
                } else {
                    // Log the error
                    console.log(xhr.response)
                }
            }
        }
        xhr.send(null);
    }

    check_for_file = () => {
        // Check if the calendar data file exists on google drive
        var xhr = new XMLHttpRequest();
        xhr.open('GET',
            'https://www.googleapis.com/drive/v3/files?' +
            'access_token=' + this.access_token+ "&" + 
            "spaces=appDataFolder");

        var found_calendar_file =  false;
        xhr.onload = (e) => {
            if (xhr.status != 200){
                // Log error
                console.log(xhr.response);
                return
            }

            // Pull the file list, and iterate over them until we find the one matching the name of the calendar data file
            const file_response = JSON.parse(xhr.response)
            for (const file of file_response["files"]){
                if ((file["name"] === this.json_file_name) && (!found_calendar_file)){
                    this.file_id = file["id"]
                    this.found_file()
                    found_calendar_file = true;
                } else {
                    // There is currently no reason that we should have other files in this webapp's gDrive folder
                    // so we clean it out while looking for the right file.
                    this.delete_file(file["id"])
                }
            }
        };
        xhr.send(null);
    }

    found_file = () => {
        // Download the file at the current set file_id
        console.log("File Exists");
        this.download_calendar_file(this.file_id);
    }


    upload_json_string_to_file = (string) => {
        // Upload the passed string as the calendar data json file to google drive.

        if (!this.access_token){
            console.error("no auth")
            return false
        }

        if (this.file_id != ""){
            // Delete the existing calendar data file
            // I hit CORS issues when trying to use the PATCH request to update the file. Deleting the old one and making a new one
            // is fine as a workaround for now. 
            this.delete_file(this.file_id);
        }
        
        // Build header
        const file = new Blob([string], {type: 'application/json'});
        var metadata = {
            'name': this.json_file_name,    // Filename on Google Drive
            'mimeType': 'application/json', // mimeType on Google Drive
            'parents': ['appDataFolder'],   // Folder ID on Google Drive
        };
        var form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', file);
        var xhr = new XMLHttpRequest();

        // open the request, set the authorization header and send the file
        xhr.open('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
        xhr.setRequestHeader('Authorization', 'Bearer ' + this.access_token);
        xhr.onload = () => {
            this.file_id = JSON.parse(xhr.response).id; // Retrieve uploaded file ID.
            console.log("Created new File " + this.file_id)
        };
        xhr.send(form);
    }

    delete_file = (file_id) => {
        // delete a file with the given file_id
        var xhr = new XMLHttpRequest();
        xhr.open('delete', 'https://www.googleapis.com/drive/v3/files/' + file_id + "?access_token=" + this.access_token);
        xhr.onload = () => {  
            // Nothing needed here, we don't get a response if the method succeeds.
            console.log("deleted: " + file_id)
        };
        xhr.send();
    }
}

export {GoogleDriveAuth, GoogleDriveCalendarFileHandler}
