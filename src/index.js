import Client from "https://designftw.github.io/chat-lib/src/Client.js";
// import Client from "http://localhost:8002/designftw/chat-lib/src/Client.js";
import {$, $$, getFormData} from "./util.js";
import templates from "./templates.js";

/**
 * the host of the server
 */
const SERVER_HOST = "https://messaging-server.csail.mit.edu";

// Root element, just for brevity
const root = document.documentElement;

/**
 * Called when the client logs in. Passes in the client and currently logged in account.
 * @param {Account} account the currently logged in account
 */
async function onLogin(account) {
	$$(".my-username").forEach(el => el.textContent = account.handle);
}

/**
 *  -------------------- The code below is for auth --------------------
 */

/**
 * Called when the document is loaded. Creates a Client and adds auth flow
 * event handling.
 */
let client = new Client(SERVER_HOST);

// Make client a global for easy debugging from the console
globalThis.client = client;

// global variables
var currentRecipient;
var me;
var them;
let name = document.getElementById("recipientname")
var friends;
var friend_list = document.getElementsByClassName("list")[0]
var added_friends = [];
var cb = document.getElementsByClassName('chatbox')[0];
var friends;
var friend_handles = [];

root.addEventListener("click", evt => {
	// Enable data-show-dialog attribute
	let showDialog = evt.target.closest("[data-show-dialog]");

	if (showDialog) {
		const dialog = document.getElementById(showDialog.getAttribute("data-show-dialog"));

		if (dialog) {
			evt.preventDefault();
			dialog.showModal();
		}
		else {
			console.warn(`No dialog found with id '${showDialog.getAttribute("data-show-dialog")}'`);
		}
	}

	// Enable elements with .close class to close their ancestor dialog
	if (evt.target.closest(".close")) {
		evt.preventDefault();
		const dialog = evt.target.closest("dialog");
		dialog?.close(); // Not sure what ?. does? See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
	}

	if (evt.target.closest(".logout")) {
		evt.preventDefault();
		client.logout();
	}
})

// Add signup form handlers

// try to signup when the user submits the signup form
signup_form.addEventListener("submit", async evt => {
	// we may want to keep the dialog open in case there's an error,
	// but knowing that there's an error takes an async request,
	// and by then it will be too late to prevent the default action
	evt.preventDefault();

	let data = getFormData(signup_form);

	let errorContainer = signup_form.querySelector(".error");
	errorContainer.innerHTML = "";

	try {
		await client.signup(data.handle, data.email, data.password);

		// Since everything went well, close the dialog manually
		// (form submission would have closed it, but we prevented the default action)
		evt.target.closest("dialog").close();
	}
	catch (err) {
		// if there is an error display the error in the form
		errorContainer.innerHTML = err.message;
	}
});

// try to login when the user submits the login form
login_form.addEventListener("submit", async evt => {
	const email = login_form.elements["email"].value;
	const password = login_form.elements["password"].value;
	let error = "";

	try {
		await client.login(email, password);
	}
	catch (err) {
		// if there is an error display the error in the form
		error = err.message;
	}

	login_form.querySelector(".error").innerHTML = error;
});


chat_with_form.addEventListener("submit", async evt => {
	messages_list.innerHTML=" ";
	evt.preventDefault();

	let data = getFormData(chat_with_form);

	me = client.account.handle;
	let friends_elements = document.querySelectorAll(".friend");
	// handles group messages
	if (data.handle.includes(',')){
		them = currentRecipient = createGroupArray(data.handle);
		them.push(me)
	// handles individual messages
	} else{
		let them = currentRecipient = data.handle;
	}
	// ensures the conversation isnt already in the conversation list
	let alreadyAdded=false;
	for (let z = 0; z<friends_elements.length; z++){
		if (friends_elements[z].innerHTML.includes(data.handle)){
			alreadyAdded=true;
		}
	}

	// adds conversation to list if it already has not been added
	if (!alreadyAdded){
		await client.addFriend(them, me);
		added_friends.push(them)
		console.log("Friend added");
		friend_list.innerHTML+=`<div class="friend"><img src="media/group.jpg"><h1 class="name">`+them+`</h1></div>`;
		
		createFriendsList();
	}
	//sets above name to the new chatter's name
	name.innerHTML=them;

	let oldMessages = [];
	// creates old messages variable for groupchats, removing messages between them with less than two recipients
	document.documentElement.classList.add("has-recipient");
	if (data.handle.includes(',')){
		oldMessages = await client.getMessages({participants: them});
		for (let i =0; i<oldMessages.length; i++){
			if (oldMessages[i].recipients.length!=them.length){
				oldMessages.splice(i, 1);
			}
		}
	}else{
	// does the same for individual chats
		oldMessages = await client.getMessages({participants: [me, them]});
		for (let i =0;i<oldMessages.length; i++){
			if (oldMessages[i].recipients.length>1){
				oldMessages.splice(i, 1);
			}
		}
	}
	messages_list.innerHTML = "";
	oldMessages.reverse();
	for(let i = 0; i < oldMessages.length; i++){
		if (oldMessages[i].data.text!=undefined){ //mesages
			if (oldMessages[i].sender == me){
				messages_list.innerHTML += [oldMessages[i]].map(templates.messageto);
			} else {
				messages_list.innerHTML += [oldMessages[i]].map(templates.messagefrom);
			}
		} else { // images
			if (oldMessages[i].sender == me){
				messages_list.innerHTML += [oldMessages[i]].map(templates.imageto);
			} else {
				messages_list.innerHTML += [oldMessages[i]].map(templates.imagefrom);
			}
		}
	}
	cb.scrollTop = cb.scrollHeight;
	await add_delete_event();
});

send_message_form.addEventListener("submit", async evt => {
	evt.preventDefault();

	let data = getFormData(send_message_form);

	// deals with group chats
	if (currentRecipient.includes(',')){
		currentRecipient = createGroupArray(currentRecipient);
		currentRecipient.push(me);
	}

	try{
		document.getElementById("recentMessage").setAttribute("id", "");
		document.getElementById("recentMessage").setAttribute("id", "");
	}
	catch(err){
		console.log("no messages sent yet")
	}

	try {		
		let message = await client.sendMessage({
			from: data.handle,
			to: currentRecipient,
			data: {
				text: data.message
			}
		});		
		// adds new message to sender's screen and creates event which lets user delete the message
		messages_list.insertAdjacentHTML("beforeend", templates.messageAnimated(message));
		cb.scrollTop = cb.scrollHeight;
		await add_delete_event();
	}
	catch (err) {
		console.error(err);
	}
});

// shows dialog element for new conversation button
var x = document.getElementById("newConvo");
var new_msg = document.getElementsByClassName("newmsg")[0]
new_msg.addEventListener("click", evt=>{
	x.show();
});
var chat_w_form = document.getElementById("chat_with_form");
chat_w_form.addEventListener("submit", evt =>{
	x.close();
});


// New message received
let newMessage = document.getElementById("newMessage");

client.addEventListener("message", async evt => {
	let {messageId} = evt.detail;
	console.log("New message received, id:", messageId);
	// TODO 1: Get a message object from this message id and display it
	let friends_elements = document.querySelectorAll(".friend");
	let new_msg = await client.getMessageById(messageId);
	let new_recipients = [];

	for (let i=0;i<new_msg.recipients.length;i++){
		new_recipients.push(new_msg.recipients[i].handle);
	}
	let new_recipients_string = new_recipients.join(",");
	// ensures user isn't receving their own message
	if (new_msg.sender.handle!=client.account.handle){
		// for gc's
		if (new_msg.recipients.length>2){
			// checks if new user is already in the conversations list
			let notPresent = true;
			for (let i=0; i<friends_elements.length; i++){
				if (friends_elements.innerHTML.includes(new_recipients_string)){
					notPresent=false;
				}
			}
			// adds new user if not already in conversation list
			if (notPresent){
				friend_list.innerHTML+=`<div class="friend"><img src="media/profile.jpeg"><h1 class="name">`+new_msg.recipients+`</h1></div>`;
				createFriendsList();
			}
			// shows a notification when a message is sent
			if (typeof name.innerHTML == "undefined" || name.innerHTML != new_recipients_string){
				newMessage.innerHTML=`<p>Message from `+new_msg.sender+`</p>`;
				newMessage.show();
				setTimeout(notification_disappear,10000);
			} else{
			// adds text onto screen if user is currently chatting with user that sent the message
				if(new_msg.data.text!=undefined){
					messages_list.innerHTML += [new_msg].map(templates.messagefrom);
				} else{
					messages_list.innerHTML += [oldMessages[i]].map(templates.imagefrom);
				}
				cb.scrollTop = cb.scrollHeight;		
			}
			return;
		}
		// adds them as a friend
		if (!friend_handles.includes(new_msg.sender.handle) && !added_friends.includes(new_msg.sender.handle) && me!=new_msg.sender.handle){
			await client.addFriend(new_msg.sender.handle, me);
			added_friends.push(new_msg.sender.handle)
			console.log("Friend added");
			friend_list.innerHTML+=`<div class="friend"><img src="media/profile.jpeg"><h1 class="name">`+new_msg.sender.handle+`</h1></div>`
			// friend list
			createFriendsList();
		} 
		// shows a notification when a message is sent
		if (typeof name.innerHTML == "undefined" || name.innerHTML != new_msg.sender.handle){
			newMessage.innerHTML=`<p>Message from `+new_msg.sender+`</p>`;
			newMessage.show();
			setTimeout(notification_disappear,10000);
		} else {
			// adds text onto screen if user is currently chatting with user that sent the message
			messages_list.innerHTML += [new_msg].map(templates.messagefrom);
			cb.scrollTop = cb.scrollHeight;	
		}
	}
});

function notification_disappear(){
	newMessage.close();
}

// TODO 2: Listen for message deletions, find the corresponding element in the DOM and remove it
// (don’t forget to also add UI for deleting messages!)
client.addEventListener("messagedeletion", async evt =>{
	let {messageId} = evt.detail;
	console.log(evt.detail)
	console.log("Message deleted, id:", messageId);
	let deletedMsg = document.getElementById(messageId);
	if (deletedMsg!="null"){
		deletedMsg.remove(); // gets message id and removes it from the user's screen
	}
});

client.addEventListener("messageupdate", async evt=>{
	let {messageId} = evt.detail;
	let msg_element  = document.getElementById(messageId);
	if (msg_element!="null"){
		console.log(msg_element.children);
		let editedMsg = await client.getMessageById(messageId)
		let newText = editedMsg.data.text
		msg_element.children[0].innerHTML+="(edited)"
		msg_element.children[1].children[0].innerHTML = newText;
		console.log("Message updated, id:", messageId);
	}
});


// update ui to reflect if the client is logged in
let account = await client.getLoggedInAccount();
root.classList.toggle("logged-in", account !== null);

// if client is logged in call account loaded
if (account !== null) {
	onLogin(account);
	let friends = await client.getFriends(client.account.handle);
	fillFriendsList();
	createGroupChats();
	createFriendsList();
}

// listen for client login and logout events
client.addEventListener("login", async evt => {
	onLogin(evt.detail.account);
	root.classList.add("logged-in");
	let friends = await client.getFriends(client.account.handle);
	fillFriendsList();
	createGroupChats();
	createFriendsList();
});
// resets chat client
client.addEventListener("logout", evt => {
	root.classList.remove("logged-in", "has-recipient");
	chat_with_form.elements.handle.value = "";
	friend_list.innerHTML=" ";
	messages_list.innerHTML=" ";
	friend_handles=[];
	let textbar = document.getElementsByClassName("typeMSG");
	textbar.innerHTML="Type your message...";
});

// adds delete event to every three dots. plan to use this to implement an edit feature later on
async function add_delete_event(){
	let message_elements = document.getElementsByClassName("msg");
	for (let i = 0; i < message_elements.length; i++){
		let msg_elem = message_elements[i]
		let msg_id = msg_elem.id
		let dot = message_elements[i].childNodes[3].childNodes[3];
		if (dot){
			 // accesses dot elements
			dot.addEventListener("click", async evt =>{
				var delete_dialog = document.createElement("dialog");
				delete_dialog.innerHTML = "<button>Delete message</button><button>Edit message</button><button>Cancel</button>"; // creates dialog which provides users a UI for deleting
				msg_elem.insertBefore(delete_dialog, msg_elem.childNodes[1]);
				let del = delete_dialog.children[0];
				let edit = delete_dialog.children[1];
				let cncl = delete_dialog.children[2];
				delete_dialog.show();
			cncl.addEventListener("click", evt=>{ // closes dialog if cancel is clicked
				delete_dialog.close();
				document.body.scrollTop = document.documentElement.scrollTop = 0;
			});
			edit.addEventListener("click", async evt=>{
				try{
					let editedMsg = await client.getMessageById(msg_id)
					delete_dialog.innerHTML = "<input type='text'></input><button>Confirm edit</button>";
					let submit_edit = delete_dialog.children[1]
					submit_edit.addEventListener("click", async evt=>{
						let newText = delete_dialog.children[0].value
						await client.updateMessage(editedMsg, {data:{text:newText}})
						console.log(msg_elem.children)
						msg_elem.children[1].innerHTML+="(edited)";
						msg_elem.children[2].children[0].innerHTML = newText;
						delete_dialog.close();
						document.body.scrollTop = document.documentElement.scrollTop = 0;
					});
				}
				catch(err){
					delete_dialog.close();
					document.body.scrollTop = document.documentElement.scrollTop = 0;
					console.log("Cannot edit this message");
				}
			});
			del.addEventListener("click", async evt =>{ // deletes message if delete is clicked
				try{
					let deletedMsg = await client.getMessageById(msg_id)
					await client.deleteMessage(deletedMsg, client.account.handle);
					console.log('Message deleted.');
					msg_elem.remove();
					delete_dialog.close();
					document.body.scrollTop = document.documentElement.scrollTop = 0;
				}
				catch(err){
					delete_dialog.close();
					document.body.scrollTop = document.documentElement.scrollTop = 0;
					console.log("Cannot delete this message.");
				}
			});
		});
		}
	}
}

// goes through user's friend's and creates a friend/conversation list visible on the left side of their screen
async function fillFriendsList(){
	let friends = await client.getFriends(client.account.handle);
	for (let z=0; z <friends.length; z++){
		if (!friend_handles.includes(friends[z].handle)){
			friend_handles.push(friends[z].handle);
		}
	}
	for (let i=0; i<friends.length; i++){
		if (client.account.handle!=friends[i].handle){
			friend_list.innerHTML+=`<div class="friend"><img src="media/profile.jpeg"><h1 class="name">`+friends[i].handle+`</h1></div>`;
		}
	}
}

async function filterFriendsList(searchInput){
	friend_list.innerHTML=''
	console.log(friend_handles);
	let search_results = friend_handles.filter(ppl => ppl.includes(searchInput))
	for (let i=0; i<search_results.length; i++){
		if (client.account.handle!=search_results[i]){
			if (search_results[i].includes(',')){
				friend_list.innerHTML+=`<div class="friend"><img class ="gc" src="media/group.jpg"><h1 class="name">`+search_results[i]+`</h1></div>`;
			} else{
				friend_list.innerHTML+=`<div class="friend"><img src="media/profile.jpeg"><h1 class="name">`+search_results[i]+`</h1></div>`;
			}
		}
	}
	createFriendsList();
}

// updates friends list and adds click listener events. users can click on their conversations in order to select and chat with desired users
async function createFriendsList(){
	let oldMessages;
	let friends = await client.getFriends(client.account.handle);
	let friends_elements = document.querySelectorAll(".friend");
	for (let j=0; j<friends_elements.length; j++){
		friends_elements[j].addEventListener("click", async evt =>{
			let me = client.account.handle;
			let them = currentRecipient = friends_elements[j].children[1].innerHTML;
			name.innerHTML=them; // sets friend as current recipient
			document.documentElement.classList.add("has-recipient");
			if (friends_elements[j].children[1].innerHTML.includes(',')){ // groupchats
				let arr = createGroupArray(friends_elements[j].children[1].innerHTML);
				oldMessages = await client.getMessages({participants: arr});
				for (let i =0; i<oldMessages.length; i++){
					if (oldMessages[i].recipients.length!=arr.length){
						oldMessages.splice(i, 1);
					}
				}
			}else{
				oldMessages = await client.getMessages({participants: [me, them]}); // individual
				for (let i =0;i<oldMessages.length; i++){
					if (oldMessages[i].recipients.length>2){
						oldMessages.splice(i, 1);
					}
				}
			}
			messages_list.innerHTML = "";
			oldMessages.reverse();
			for(let i = 0; i < oldMessages.length; i++){
				if (oldMessages[i].data.text!=undefined){ //mesages
					if (oldMessages[i].sender == me){
						messages_list.innerHTML += [oldMessages[i]].map(templates.messageto);
					} else {
						messages_list.innerHTML += [oldMessages[i]].map(templates.messagefrom);
					}
				} else { // images
					if (oldMessages[i].sender == me){
						messages_list.innerHTML += [oldMessages[i]].map(templates.imageto);
					} else {
						messages_list.innerHTML += [oldMessages[i]].map(templates.imagefrom);
					}
				}	
			}
			cb.scrollTop = cb.scrollHeight;
			await add_delete_event();
		});
	}
}

async function createGroupChats(){ // goes through every message, picks out messages with more than 2 recipients, and creates groups based off of what is found
	let friends = await client.getFriends(client.account.handle);
	for (let i = 0; i < friends.length; i++){ // iterates through every conversation
		let conversations = await client.getMessages({participants: [me, friends[i]]});
		for (let j=0; j<conversations.length; j++){ // iterates through every message
			let friends_elements = document.querySelectorAll(".friend"); 
			let recip = conversations[j].recipients;
			if(recip.length>2){
				let group = [];
				for (let k=0; k<recip.length; k++){
					group.push(recip[k])
				}
				let notPresent = true;
				let group_str = group.join(",")
				if (!friend_handles.includes(group_str)){
					friend_handles.push(group_str);
				}
				for (let z = 0; z<friends_elements.length; z++){
					if (friends_elements[z].innerHTML.includes(group_str)){
						notPresent=false; // ensures there are no repeats on the conversation list
					}
				}
				if (notPresent){
					friend_list.innerHTML+=`<div class="friend"><img class ="gc" src="media/group.jpg"><h1 class="name">`+group+`</h1></div>`;
				}
			}
		}
	}
	createFriendsList(); // updates friends list and adds listener events
}

// takes a string which represents a group and turns it into an array, which is used to send group messages.
function createGroupArray(str){ 
	let group_members = str.split(",");
	let return_list = group_members.map(element => {
		return element.trim();
	});
	return return_list
}

let img_form = document.getElementById("send_image");

document.getElementById("cancelsend").addEventListener("click", evt=>{ //opening and closing send image dialog
	img_form.close()
});
document.getElementById("camera").addEventListener("click",  evt=>{
	img_form.show()
});



let photo_upload = document.getElementById('upload');
photo_upload.addEventListener('change', showImage); // shows/previews image when an image is uploaded

var data_url;

var submit_img = document.getElementById("submit")
function showImage(evt) {
    var files = evt.target.files; //gets formm data

    if (files.length === 0) {
        console.log('No files selected');
        return;
    }

    var reader = new FileReader();
    reader.onload = function(event) { //turns image into Data URL, which is then sent as a message
        var img = new Image();
        img.onload = function() {
			console.log(img);
			img.setAttribute("class", "preview_img")
			img_form.insertAdjacentElement("afterbegin", img); // previews image (safety feature)
        };
		data_url = event.target.result; 
        img.src = event.target.result;
    };
    reader.readAsDataURL(files[0]);
	
}

submit_img.addEventListener("click", async evt=>{ // sends image
	try {		
		let message = await client.sendMessage({
			from: client.account.handle,
			to: currentRecipient,
			data: data_url
		});		
		// adds new message to sender's screen and creates event which lets user delete the message
		messages_list.insertAdjacentHTML("beforeend", templates.imageto(message));
		cb.scrollTop = cb.scrollHeight;
		await add_delete_event();
		img_form.close();
	}
	catch (err) {
		console.error(err);
		img_form.close();
	}
});

document.getElementById('searchbar').addEventListener("input", async evt=>{
	try{
		filterFriendsList(evt.target.innerHTML);
	}
	catch(err){
		console.error(err);
		evt.target.innerHTML="Search..."
	}
})

document.getElementById('searchbar').addEventListener("blur", evt=>{
	if (evt.target.innerHTML==""){
		evt.target.innerHTML="Search..."
	}
})