(* ::Package:: *)

(* ::Section:: *)
(*Import*)


SetAttributes[logWrite,HoldAllComplete];
logWrite[message_]:=WriteString[Streams["stdout"],message];
SetAttributes[logWriteDebug,HoldAllComplete];
logWriteDebug[message_]:=Null;(*logWrite[message];*)
logError[message_]:=(WriteString[Streams["stdout"],"<ERROR> "<>message];Exit[];)


logWrite["<INITIALIZATION STARTS>"];
$hasZeroMQ=(Quiet@Needs["ZeroMQLink`"]=!=$Failed);
$hasCodeParser=(Quiet@Needs["CodeParser`"]=!=$Failed);


If[$VersionNumber<12.0,
  logError["Version 12.0 or higher is required."];Exit[];
];
If[TrueQ@MatchQ[ToBoxes[NumberForm[1.*^-20]],TagBox[InterpretationBox[StyleBox[RowBox[{"\"1.\"","\[Times]",SuperscriptBox["10","\"-20\""]}],___],___],___]],
  $numberFormHasStyleBox=True;,
  If[TrueQ@MatchQ[ToBoxes[NumberForm[1.*^-20]],TagBox[InterpretationBox[RowBox[{"\"1.\"","\[Times]",SuperscriptBox["10","\"-20\""]}],___],___]],
    $numberFormHasStyleBox=False;,
    logError["Unexpected box form of real numbers."];Exit[];
  ];
];
If[!$hasZeroMQ,
  logError["Failed to load ZeroMQLink` package."];Exit[];
];


SetAttributes[abortOnMessage,HoldAllComplete];
abortOnMessage[code_]:=Block[{return},
  Internal`AddHandler["Message",If[Last[#],Abort[]]&];
  return=CheckAbort[code,$Aborted];
  Internal`RemoveHandler["Message",If[Last[#],Abort[]]&];
  return
]


(* ::Section:: *)
(*Config*)


If[Head[zmqPort]===Integer&&0<zmqPort<65536,Null,zmqPort=Null];


$config=<|
  "storeOutputExpressions"-><|"value"->True,"requires"->(#===True||#===False&)|>,
  "outputSizeLimit"-><|"value"->5000(*KB*),"requires"->(Head[#]===Integer&&#>0&)|>,
  "boxesTimeLimit"-><|"value"->5000(*ms*),"requires"->(Head[#]===Integer&&#>0&)|>,
  "htmlTimeLimit"-><|"value"->10000(*ms*),"requires"->(Head[#]===Integer&&#>0&)|>,
  "htmlMemoryLimit"-><|"value"->200(*MB*),"requires"->(Head[#]===Integer&&#>0&)|>,
  "imageWithTransparency"-><|"value"->False,"requires"->(#===True||#===False&)|>,
  "renderAsImages"-><|"value"->False,"requires"->(#===True||#===False&)|>
|>;


$setKernelConfig[name_,value_]:=Module[{entry=$config[name]},
  If[MissingQ[entry],
    logWrite[ToString[name]<>" is not a valid config name to be set."];,
    If[!TrueQ[entry["requires"][value]],
      logWrite[ToString[value]<>" is not a valid value of "<>ToString[name]<>"."];Return[];,
      $config[name]["value"]=value;
    ];
  ];
];


$getKernelConfig[name_]:=If[MissingQ[$config[name]],
  logWrite[ToString[name]<>" is not a valid config name to be read"];0,
  $config[name]["value"]
];


(* ::Section:: *)
(*Initialize kernel*)


$evaluating=Null;
$evaluationQueue=<|(*<|"uuid"\[Rule]...,"packet"\[Rule]...,"progress"\[Rule]{i,n}|>*)|>;
$outputQueue=<|(*<|"uuid"\[Rule]...,"type"\[Rule]...,"name"?\[Rule]...,"packet"?\[Rule]...|>*)|>;
$currentOutputMessage="";
$previousOutputMessage="";
$inputName="Null";
$outputName="Null";
$messagedebug=Null;


logWrite["$CommandLine="<>StringTake[ToString[$CommandLine],UpTo[200]]];
logWrite["$ScriptCommandLine="<>StringTake[ToString[$ScriptCommandLine],UpTo[200]]];
Quiet@LinkClose[$kernel];

$kernel=LinkCreate[CreateUUID[]];
$preemptive=LinkCreate[CreateUUID[]];
If[Head[$kernel]=!=LinkObject||Head[$preemptive]=!=LinkObject,
  logError["Failed to create main and preemptive links; $kernel="<>ToString[$kernel]];
]

$kernelCommand={First[$CommandLine],"-noicon","-wstp","-linkprotocol","SharedMemory","-linkmode","connect","-linkname",$kernel[[1]]};
logWrite["Using the following command to launch the subkernel process:"];
logWrite[StringRiffle[$kernelCommand," "]];
$process=StartProcess[$kernelCommand];
$processID=Null;

TimeConstrained[
  While[!(LinkReadyQ[$kernel]),Pause[0.1];];
  (* read the first InputNamePacket *)
  Module[{packet=LinkRead[$kernel]},
    If[Head[packet]===InputNamePacket,
      $inputName=packet[[1]];,
      logError["The first packet is not a InputNamePacket; packet="<>ToString[packet]];
    ];
  ];
  (* set up preemptive link; get kernel process id *)
  With[{name=$preemptive[[1]]},
    LinkWrite[$kernel,Unevaluated[EvaluatePacket[
      MathLink`AddSharingLink[
        LinkConnect[name],
        MathLink`AllowPreemptive->True,
        MathLink`ImmediateStart->True
      ];$ProcessID
    ]]];
    $processID=LinkRead[$kernel][[1]];
  ];
  logWrite["Subkernel launched; $preemptive="<>ToString@$preemptive<>", $processID="<>ToString[$processID]];,
  30.0,
  logError["Failed to launch computation kernel; $kernel="<>ToString[$kernel]];
];

Unprotect[EnterExpressionPacket,EvaluatePacket,ReturnExpressionPacket,ReturnPacket,EnterTextPacket];
SetAttributes[{EnterExpressionPacket,EvaluatePacket,ReturnExpressionPacket,ReturnPacket,EnterTextPacket},{HoldAllComplete}];
Protect[EnterExpressionPacket,EvaluatePacket,ReturnExpressionPacket,ReturnPacket,EnterTextPacket];
Unprotect[Short];
SetAttributes[Short,HoldFirst];
Protect[Short];


ClearAll[sendMessage,readMessage];
sendMessage[message_ByteArray]:=ZeroMQLink`ZMQSocketWriteMessage[$zmqserver,message];
sendMessage[message_Association]:=sendMessage[StringToByteArray@Developer`WriteRawJSONString[message,"Compact"->True]];
sendMessage[message_]:=sendMessage[StringToByteArray[ToString[message],"UTF-8"]];
readMessage[timeout_:1.0]:=Module[{ready=SocketReadyQ[$zmqserver,timeout]},If[ready,ByteArrayToString[SocketReadMessage[$zmqserver],"UTF-8"],$Failed]];
(*sendMessage[message_]:=Echo[message];
readMessage[timeout_:1.0]:=Module[{temp},Pause[timeout];If[Head[$messagedebug]===String,temp=$messagedebug;$messagedebug=Null;temp,$Failed]];*)


handleOutput[]:=Module[{},
  Module[{output=queuePop[$outputQueue],boxes,exceedsExprSize,text,html},
    $previousOutputMessage=$currentOutputMessage;
    $currentOutputMessage="";
    Switch[output["type"],
      InputNamePacket,
        sendMessage[<|
          "type"->"evaluation-done",
          "uuid"->output["uuid"]
        |>];,
      ReturnExpressionPacket,
        logWriteDebug["boxesTimeLimit = "<>ToString[$getKernelConfig["boxesTimeLimit"]/1000.0]<>" seconds"];
        TimeConstrained[
          exceedsExprSize=!TrueQ[ByteCount[output["packet"]]<=$getKernelConfig["outputSizeLimit"]*2^10];
          If[exceedsExprSize,
            output["packet"]=Replace[output["packet"],ReturnExpressionPacket[expr_]:>ReturnExpressionPacket[Short[expr,5]]]
          ];
          boxes=If[MatchQ[#,ReturnExpressionPacket[BoxData[_,TraditionalForm]]],
            FormBox[#[[1,1]],TraditionalForm],
            MakeBoxes@@#
          ]&[output["packet"]];
          text=If[exceedsExprSize||(!TrueQ@$getKernelConfig["storeOutputExpressions"]),"",
            Replace[output["packet"],ReturnExpressionPacket[expr_]:>ToString[Unevaluated[expr],InputForm]]
          ];,
          $getKernelConfig["boxesTimeLimit"]/1000.0,
          boxes=renderingFailed["The conversion to the box representation took too much time."];
          text="$Failed";
        ];
        
        logWriteDebug["htmlMemoryLimit = "<>ToString[$getKernelConfig["htmlMemoryLimit"]]<>" MB"];
        logWriteDebug["htmlTimeLimit = "<>ToString[$getKernelConfig["htmlTimeLimit"]/1000.0]<>" seconds"];
        html=TimeConstrained[
          MemoryConstrained[
            If[$getKernelConfig["renderAsImages"],renderImage,renderHTML][boxes],
            $getKernelConfig["htmlMemoryLimit"]*2^20,
            renderHTML@renderingFailed["Rendering to HTML took much memory."]
          ],
          $getKernelConfig["htmlTimeLimit"]/1000.0,
          renderHTML@renderingFailed["Rendering to HTML took much time."]
        ];
        sendMessage[<|
          "type"->"show-output",
          "uuid"->output["uuid"],
          "name"->output["name"],
          "text"->If[TrueQ@$getKernelConfig["storeOutputExpressions"],text,Null],
          "html"->html
        |>];,
      MessagePacket,
        $currentOutputMessage=TemplateApply["``::``", List@@output["packet"]];,
      TextPacket,
        If[StringContainsQ[$previousOutputMessage,"::"]&&StringContainsQ[output["packet"][[1]],$previousOutputMessage],
          sendMessage[<|
            "type"->"show-message",
            "uuid"->output["uuid"],
            "text"->output["packet"][[1]],
            "html"->StringJoin["<pre>",StringReplace[
              renderHTMLescape[output["packet"][[1]]],
              $previousOutputMessage->("<span class=\"wl-message\">"<>$previousOutputMessage<>"</span>")
            ],"</pre>"]
          |>];
          ,
          sendMessage[<|
            "type"->"show-text",
            "uuid"->output["uuid"],
            "text"->output["packet"][[1]],
            "html"->StringJoin["<pre>",renderHTMLescape[output["packet"][[1]]],"</pre>"]
          |>];
        ],
      _,
        logWrite["Unknown output type; output="<>ToString[output]];
    ];
  ];
];


$dangeroussymbols=ToExpression[#,InputForm,HoldComplete]&/@ToExpression@StringCases[
  Import[FileNameJoin[{$InstallationDirectory,"SystemFiles","FrontEnd","TextResources","MiscExpressions.tr"}],"Text"],
  "@@resource DangerousSymbols"~~Shortest[___]~~(list:("{"~~Shortest[___]~~"}")):>list
][[1]];
isdangerous[expr_]:=Intersection[Cases[expr,s_Symbol:>HoldComplete[s],{0,Infinity},Heads->True],$dangeroussymbols]=!={};

handleMessage[]:=Module[{},
  $message=Quiet@Developer`ReadRawJSONString[$messagetext];
  logWriteDebug["message received: "<>ToString[$messagetext]<>"\n"];
  If[$message===$Failed,
    logError["Error occured in parsing the previous message.\n$messagetext = "<>ToString[$messagetext]];
    Return[];
  ];
  Module[{packets,uuid,match,syntaxErrors},
    Switch[$message["type"],
      "test",
        sendMessage[<|"type"->"test","text"->$message["text"],"version"->$Version|>];,
      "evaluate-cell",
        If[SyntaxQ[$message["text"]],
          packets=List@@Thread[EnterExpressionPacket[#],EnterExpressionPacket]&@
            ToExpression[$message["text"],InputForm,EnterExpressionPacket];,
          If[$hasCodeParser,
            syntaxErrors=Cases[CodeParser`CodeParse[$message["text"]],(ErrorNode|AbstractSyntaxErrorNode|UnterminatedGroupNode|UnterminatedCallNode)[___],Infinity];
            logWriteDebug["The expression has the following syntax errors: "<>ToString[syntaxErrors]];,
            syntaxErrors={};
            logWriteDebug["The expression has syntax errors (CodeParser` is unavailable)"];
          ];
          queuePush[$outputQueue,<|
            "uuid"->$message["uuid"],
            "type"->TextPacket,
            "packet"->TextPacket[#]
          |>&@StringRiffle[
            If[Length[syntaxErrors]==0,{"Syntax error at character "<>ToString@SyntaxLength[$message["text"]]},
              TemplateApply["Syntax error `` at line `` column ``",{ToString[#1],Sequence@@#3[CodeParser`Source][[1]]}]&@@@syntaxErrors
            ],"\n"
          ]];
          queuePush[$outputQueue,<|
            "uuid"->$message["uuid"],
            "type"->InputNamePacket
          |>];
          packets={};
        ];
        (*packets=If[isdangerous[#],EnterExpressionPacket[#]&@ReplacePart[#,0->HoldComplete],#]&/@packets;*)
        Do[
          queuePush[$evaluationQueue,<|
            "uuid"->$message["uuid"],
            "packet"->packets[[i]],
            "progress"->{i,Length[packets]}
          |>];
        ,{i,1,Length[packets]}];,
      "abort-evaluations",
        If[evaluating=!=Null,
          logWrite["Aborting current evaluation... ($processID="<>ToString[$processID]<>")"];
          LinkInterrupt[$kernel];,
          logWrite["No evaluation is currently running, ignoring abort ($processID="<>ToString[$processID]<>")"];
        ];
        queueClear[$evaluationQueue];
        queueClear[$outputQueue];,
      "clear-queue",
        queueClear[$evaluationQueue];,
      "reply-input",
        LinkWrite[$kernel,EnterTextPacket@@{$message["text"]}];,
      "reply-input-string",
        LinkWrite[$kernel,$message["text"]];,
      "set-config",
        KeyValueMap[$setKernelConfig,$message["config"]];,
      "cancel-front-end-tasks",
        TaskRemove[Tasks[]];,
      "evaluate-front-end",
        If[SyntaxQ@$message["text"],
          Quiet@If[$message["aync"]===True,
            With[{expr=$message["text"]},LocalSubmit[ToExpression[expr]];];,
            ToExpression[$message["text"]]
          ];,
          logWrite["Syntax error in the previous front end evaluation: "<>$message["text"]];
        ],
      "request-export-notebook",
        Module[{type,text,cellLabel,boxes,notebook,escape,fragments,parseElement},
          escape=ToString[#,InputForm,CharacterEncoding->"ASCII"]&;
          parseElement[list_List]:=parseElement/@list;
          parseElement[text_String]:=text;
          parseElement[obj_Association]:=Switch[obj["type"],
            "Hyperlink",ButtonBox[parseElement@obj["children"],BaseStyle->"Hyperlink",ButtonData->{URL[obj["link"]],None}],
            "Image",ButtonBox[parseElement@obj["children"],BaseStyle->"Hyperlink",Appearance->"Palette",ButtonData->{URL[obj["link"]],None}],
            "Button",ButtonBox[parseElement@obj["children"],BaseStyle->"Hyperlink",Appearance->"DialogBox",ButtonData->{URL[obj["link"]],None}],
            "Italic",StyleBox[parseElement@obj["children"],FontSlant->Italic],
            "Bold",StyleBox[parseElement@obj["children"],FontWeight->Bold],
            "StrikeThrough",StyleBox[parseElement@obj["children"],FontVariations->{"StrikeThrough"->True}],
            "Superscript",Cell[BoxData[FormBox[SuperscriptBox["",parseElement@obj["children"]], TraditionalForm]],FormatType->TraditionalForm],
            "Subscript",Cell[BoxData[FormBox[SubscriptBox["",parseElement@obj["children"]], TraditionalForm]],FormatType->TraditionalForm],
            "Smaller",StyleBox[parseElement@obj["children"],FontSize->Small],
            "Code",StyleBox[parseElement@obj["children"],FontFamily->"Consolas",FontColor->Darker[Red]],
            _,"Invalid object type["<>ToString[obj,InputForm]<>"]"
          ];
          parseElement[x_]:="Invalid element["<>ToString[x,InputForm]<>"]";
          notebook=Table[
            type=ToString@Lookup[cell,"type","Text"];
            text=Lookup[cell,"text",""];
            cellLabel=If[Head[#]===String&&StringLength[#]>0,",CellLabel->"<>escape[#],""]&@cell["label"];
            Switch[type,
              "Output",
                If[StringLength[text]>0,
                  boxes=TimeConstrained[
                    Quiet@ToString[ToExpression[text,InputForm,MakeBoxes],InputForm,CharacterEncoding->"ASCII"],
                    $getKernelConfig["boxesTimeLimit"]/1000.0,
                    Quiet@ToString[Quiet@ToExpression[
                      "Tooltip[Skeleton[1],\"The conversion to the box representation took too much time.\"]",InputForm,ToBoxes
                    ],InputForm,CharacterEncoding->"ASCII"];
                  ];,
                  boxes=Quiet@ToString[Quiet@ToExpression[
                    "Tooltip[Skeleton[1],\"The expression was not stored.\"]",InputForm,MakeBoxes
                  ],InputForm,CharacterEncoding->"ASCII"];
                ];
                "Cell[BoxData["<>boxes<>"],\"Output\""<>cellLabel<>"]",
              "Input",
                If[SyntaxQ["\("<>text<>"\)"],
                  boxes=Quiet@ToString[ToExpression["\("<>text<>"\)",InputForm],InputForm,CharacterEncoding->"ASCII"];
                  "Cell[BoxData["<>boxes<>"],\"Input\""<>cellLabel<>"]",
                  "Cell[TextData["<>escape[text]<>"],\"Input\""<>cellLabel<>"]"
                ],
              "HorizontalLine",
                "Cell[\"\",\"Text\",Editable->False,Selectable->False,ShowCellBracket->False,CellFrame->{{0,0},{0,1}},CellMargins->{{0,0},{1,1}},CellElementSpacings->{\"CellMinHeight\"->1},CellFrameMargins->0,CellSize->{Inherited,3}]",
              _,
                fragments=StringJoin[StringRiffle[escape/@(parseElement@Flatten[{text}]),{"{",",","}"}]];
                "Cell[TextData["<>fragments<>"],\""<>type<>"\""<>cellLabel<>"]"
            ]
          ,{cell,$message["cells"]}];
          notebook=StringRiffle[notebook,{"Notebook[{\n",",\n","\n}]\n"}];
          sendMessage[<|
            "type"->"reply-export-notebook",
            "path"->$message["path"],
            "text"->notebook
          |>];
        ];,
      _,
        logWrite["Unknown message type; message="<>ToString[$message]];
    ];
  ];
];


handleMainLink[]:=Module[{},
  $evaluating=queuePop[$evaluationQueue];
  If[$evaluating["progress"][[1]]===1,
    sendMessage[<|
      "type"->"show-input-name",
      "uuid"->$evaluating["uuid"],
      "name"->$inputName
    |>];
    $inputName="Null";
  ];
  LinkWrite[$kernel,$evaluating["packet"]];
  Module[{packet},
    While[True,
      If[LinkReadyQ[$kernel]===False,
        $messagetext=readMessage[0.03];
        If[Head[$messagetext]===String,handleMessage[];];
        Continue[];
      ];
      packet=Quiet@LinkRead[$kernel];
      logWriteDebug["packet="<>ToString[packet]<>"\n"];
      If[Head[packet]===LinkRead,
        logWrite["The kernel appears to be dead, exiting..."];
        Quit[];
      ];
      logWriteDebug["Head[packet]="<>ToString[Head[packet]]<>"\n"];
      Switch[Head[packet],
        InputNamePacket,
          If[$evaluating["progress"][[1]]===$evaluating["progress"][[2]],
            queuePush[$outputQueue,<|
              "uuid"->$evaluating["uuid"],
              "type"->InputNamePacket
            |>];
          ];
          $inputName=packet[[1]];
          $evaluating=Null;
          Break[];,
        OutputNamePacket,
          $outputName=packet[[1]];,
        ReturnExpressionPacket,
          queuePush[$outputQueue,<|
            "uuid"->$evaluating["uuid"],
            "name"->$outputName,
            "type"->Head[packet],
            "packet"->packet
          |>];
          $outputName="Null";,
        TextPacket|MessagePacket,
          queuePush[$outputQueue,<|
            "uuid"->$evaluating["uuid"],
            "type"->Head[packet],
            "packet"->packet
          |>];,
        InputPacket|InputStringPacket,
          (*directly post a message to the front end*)
          sendMessage[<|
            "type"->If[Head[packet]===InputPacket,"request-input","request-input-string"],
            "prompt"->packet[[1]]
          |>];,
        MenuPacket,
          If[packet[[2]]==="Interrupt> ",
            LinkWrite[$kernel,"a"];,
            logWrite["Unexpected packet; packet="<>ToString[packet]];
          ];,
        _,
          logWrite["Unexpected packet; packet="<>ToString[packet]];
      ];
    ];
  ];
];


(* ::Section:: *)
(*Main*)


$zmqserver=SocketOpen[{"127.0.0.1",zmqPort},"ZMQ"];
If[Head[$zmqserver]=!=SocketObject,logError["Failed to create a ZeroMQ local server on port "<>ToString[zmqPort]<>"."];Exit[];];
logWrite[TemplateApply["[address tcp://127.0.0.1:``]\n",$zmqserver["DestinationPort"]]];


(* make a call of MakeBoxes on an image *)
MakeBoxes[#]&@Image[{{0}}];
(* make a call to Legended *)
Legended[0,0];


logWrite["<INITIALIZATION ENDS>"];


While[True,
  $messagetext=readMessage[0.03];
  If[Head[$messagetext]===String,
    (*Echo[{$evaluating,$evaluationQueue,$outputQueue,$inputName,$outputName}];*)
    handleMessage[];
  ];
  If[Length[$evaluationQueue]>0,
    (*Echo[{$evaluating,$evaluationQueue,$outputQueue,$inputName,$outputName}];*)
    handleMainLink[];
  ];
  If[Length[$outputQueue]>0,
    (*Echo[{$evaluating,$evaluationQueue,$outputQueue,$inputName,$outputName}];*)
    Pause[0.03];
    handleOutput[];
  ];
];
