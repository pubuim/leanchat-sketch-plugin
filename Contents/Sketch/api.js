var leanchatPath = NSHomeDirectory() + "/.leanchat"
var leanchatChannel = NSHomeDirectory() + "/.leanchat-channel"

function setLeanChatWebHook(doc) {
	var webhook = getLeanchatWebhook()
	webhook = [doc askForUserInput:"请输入零信 Webhook" initialValue:webhook]
	if (webhook && webhook.startsWith("https://hooks.pubu.im/services")) {
		var fileManager = NSFileManager.defaultManager()
		fileManager.createFileAtPath_contents_attributes(leanchatPath, webhook, nil)
	} else {
		[doc showMessage:"地址有误，请重新输入"]
	}
}

function getLeanchatWebhook() {
	var fileExists = NSFileManager.defaultManager().fileExistsAtPath(leanchatPath);
	if (fileExists) {
		var webhook = NSString.stringWithContentsOfFile_encoding_error(leanchatPath, NSUTF8StringEncoding, nil)
		if (!webhook || !webhook.startsWith("https://hooks.pubu.im/services")) {
				return false
		}
    log('get leanchat Webhook: ' + webhook)
		return webhook
	} else {
		return false;
	}
}

function sendLeanchat(doc, path) {
  var webhook = getLeanchatWebhook()
  var channel = selectChannel()

  var args = [
    "-v -F file=@"+ path +" --form-string channel=\"" + channel  +"\" " + webhook
  ]
	
	log('send args: ' + args)
	
	if (channel) {
		var args = NSArray.arrayWithObjects("-fsSL","-F", "file=@" + path , "--form-string" ,"channel=" + channel ,  webhook )
	} else {
		var args = NSArray.arrayWithObjects("-fsSL","-F", "file=@" + path , webhook )
	}


  var result = runCommand("/usr/bin/curl", args)

	if (result){
		[doc showMessage:"分享成功"]
	} else {
		[doc showMessage:"分享失败"]
	}
}

function runCommand(command, args) {
  var task = NSTask.alloc().init();
  task.launchPath = command;
  task.arguments = args;
	var outputPipe = [NSPipe pipe]
	var errorPipe = [NSPipe pipe]
	[task setStandardOutput:outputPipe]
	[task setStandardError:errorPipe]
  task.launch();
	task.waitUntilExit();
	log("status :" + task.terminationReason())

	var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile]
  var outputString = String([[[NSString alloc] initWithData:outputData encoding:NSUTF8StringEncoding]])
	var errorData = [[outputPipe fileHandleForReading] readDataToEndOfFile]
  var errorString = [[[NSString alloc] initWithData:errorData encoding:NSUTF8StringEncoding]]
	
	log('runCommand result: ' + outputString)
	log('runCommand error: ' + errorString)

  return (outputString.indexOf('error":1') == -1 && task.terminationStatus() == 0)
}

function exportArtboardsAndSendTo(context) {
	var selection = context.selection
	var doc = context.document
	
	var loop = [selection objectEnumerator]
	var count = 0
	while (item = [loop nextObject]) {
		count += 1
		if (item.className() == "MSArtboardGroup") {
			var path = NSTemporaryDirectory() + item.name() + ".png"
      log('send Leanchat: ' + path)
			[doc saveArtboardOrSlice:item toFile: path];
			sendLeanchat(doc, path)
		}
	}
	if (count == 0){
		[doc showMessage:"请选则要上传的 Artboard"]
	}
}

function selectChannel() {
	var channels = getSelectChannel()
	var select = createSelect('请选择发送的频道', channels , 0)

	log("select selfInput: " + select)
	if (typeof select == 'number') {
		select = channels[select]

		if (select == '默认') {
			return false
		}

		return select
	} else if (typeof select == 'object' ) {
		channels.push(String(select))
		setSelectChannel(channels)
		return select
	}
	log('send to: ' + select)
}

function setSelectChannel(value) {
	log('set leanchat channel: ' + value)
	var fileExists = NSFileManager.defaultManager().fileExistsAtPath(leanchatChannel);
	var fileManager = NSFileManager.defaultManager()
	value = NSString.stringWithString(JSON.stringify(value))
	value = [value dataUsingEncoding:NSUTF8StringEncoding];
	fileManager.createFileAtPath_contents_attributes(leanchatChannel, value, nil)
}

function getSelectChannel() {
	var fileExists = NSFileManager.defaultManager().fileExistsAtPath(leanchatChannel);
	if (fileExists) {
		var channel = NSString.stringWithContentsOfFile_encoding_error(leanchatChannel,NSUTF8StringEncoding,nil)
    log('get leanchat channel: ' + channel)
		channel = JSON.parse(channel)
		return channel
	} else {
		return ['默认'];
	}
}

function createSelect(msg, items, selectedItemIndex){
  selectedItemIndex = selectedItemIndex || 0

  var accessory = [[NSComboBox alloc] initWithFrame:NSMakeRect(0,0,200,25)]
  [accessory setCompletes:true]
  [accessory addItemsWithObjectValues:items]
  [accessory selectItemAtIndex:selectedItemIndex]

  var alert = [[NSAlert alloc] init]
  [alert setMessageText:msg]
  [alert addButtonWithTitle:'OK']
  [alert addButtonWithTitle:'Cancel']
  [alert setAccessoryView:accessory]

  var responseCode = [alert runModal]
	log(responseCode)
  if (responseCode == 1000) {
	  var selectIndex = [accessory indexOfSelectedItem]

		if(selectIndex == -1) {
			var selfInput = [accessory stringValue]
			return selfInput
		}
	  return selectIndex
  } else {
	  return -1
  }
}
 