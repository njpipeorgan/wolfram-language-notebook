(* ::Package:: *)

ClearAll[queuePush,queuePop,queueClear,stackPush,stackPop,stackClear];
SetAttributes[{queuePush, queuePop,queueClear,stackPush,stackPop,stackClear}, HoldFirst];
queuePush[q_, value_]:=Module[{},AssociateTo[q, $ModuleNumber->value]];
queuePop[q_]:=If[Length[q]>0,With[{first=Take[q,1]},KeyDropFrom[q, Keys@first];first[[1]]],Null];
queueClear[q_]:=Module[{},q=<||>];
stackPush[q_, value_]:=Module[{},AssociateTo[q, $ModuleNumber->value]];
stackPop[q_]:=If[Length[q]>0,With[{last=Take[q,-1]},KeyDropFrom[q, Keys@last];last[[1]]],Null];
stackClear[q_]:=Module[{},q=<||>];


$IterationLimit=400000;
$RecursionLimit=100000;
privateReplacements=FromCharacterCode/@<|"\[LeftAssociation]"->{60,124},"\[RightAssociation]"->{124,62},"\[Shah]"->{1064},"\[TwoWayRule]"->{8596},"\[FreeformPrompt]"->{91,61,93},"\[WolframAlphaPrompt]"->{123,61,125},"\[InvisibleSpace]"->{8203},"\[Piecewise]"->{123},"\[IndentingNewLine]"->{10},"\[SystemsModelDelay]"->{955},"\[Continuation]"->{8945},"\[RoundSpaceIndicator]"->{9251},"\[InvisiblePrefixScriptBase]"->{8203},"\[InvisiblePostfixScriptBase]"->{8203},"\[EntityStart]"->{91,38,124},"\[EntityEnd]"->{124,59,93},"\[SpanFromLeft]"->{8943},"\[SpanFromAbove]"->{8942},"\[SpanFromBoth]"->{8945},"\[Transpose]"->{7488},"\[Conjugate]"->{42},"\[ConjugateTranspose]"->{8224},"\[StepperRight]"->{8594},"\[StepperLeft]"->{8592},"\[StepperUp]"->{8593},"\[StepperDown]"->{8595},"\[HermitianConjugate]"->{7476},"\[VerticalBar]"->{124},"\[NotVerticalBar]"->{8740},"\[Distributed]"->{8776},"\[Conditioned]"->{10632},"\[Gradient]"->{8711},"\[Divergence]"->{8711,46},"\[Curl]"->{8711,120},"\[ContinuedFractionK]"->{75},"\[TensorProduct]"->{8855},"\[TensorWedge]"->{8743},"\[ProbabilityPr]"->{80,114},"\[ExpectationE]"->{69,120},"\[PermutationProduct]"->{8857},"\[Earth]"->{8853},"\[Equal]"->{10869},"\[VerticalSeparator]"->{124},"\[VectorGreater]"->{8827},"\[VectorGreaterEqual]"->{10928},"\[VectorLess]"->{8826},"\[VectorLessEqual]"->{10927},"\[Limit]"->{108,105,109},"\[MaxLimit]"->{108,105,109},"\[MinLimit]"->{108,105,109},"\[Cross]"->{215},"\[Function]"->{10236},"\[DiscreteShift]"->{120666},"\[DifferenceDelta]"->{120665},"\[DiscreteRatio]"->{120679},"\[RuleDelayed]"->{10740},"\[Square]"->{9633},"\[Rule]"->{8594},"\[Implies]"->{8658},"\[ShortRightArrow]"->{8594},"\[ShortLeftArrow]"->{8592},"\[SelectionPlaceholder]"->{9632},"\[Placeholder]"->{9633},"\[ShortUpArrow]"->{8593},"\[ShortDownArrow]"->{8595},"\[Application]"->{8226},"\[LeftBracketingBar]"->{124},"\[RightBracketingBar]"->{124},"\[LeftDoubleBracketingBar]"->{124,124},"\[RightDoubleBracketingBar]"->{124,124},"\[ScriptA]"->{119990},"\[ScriptB]"->{119991},"\[ScriptC]"->{119992},"\[ScriptD]"->{119993},"\[ScriptF]"->{119995},"\[ScriptH]"->{119997},"\[ScriptI]"->{119998},"\[ScriptJ]"->{119999},"\[ScriptK]"->{120000},"\[ScriptM]"->{120002},"\[ScriptN]"->{120003},"\[ScriptP]"->{120005},"\[ScriptQ]"->{120006},"\[ScriptR]"->{120007},"\[ScriptS]"->{120008},"\[ScriptT]"->{120009},"\[ScriptU]"->{120010},"\[ScriptV]"->{120011},"\[ScriptW]"->{120012},"\[ScriptX]"->{120013},"\[ScriptY]"->{120014},"\[ScriptZ]"->{120015},"\[GothicA]"->{120094},"\[GothicB]"->{120095},"\[GothicC]"->{120096},"\[GothicD]"->{120097},"\[GothicE]"->{120098},"\[GothicF]"->{120099},"\[GothicG]"->{120100},"\[GothicH]"->{120101},"\[GothicI]"->{120102},"\[GothicJ]"->{120103},"\[GothicK]"->{120104},"\[GothicL]"->{120105},"\[GothicM]"->{120106},"\[GothicN]"->{120107},"\[GothicO]"->{120108},"\[GothicP]"->{120109},"\[GothicQ]"->{120110},"\[GothicR]"->{120111},"\[GothicS]"->{120112},"\[GothicT]"->{120113},"\[GothicU]"->{120114},"\[GothicV]"->{120115},"\[GothicW]"->{120116},"\[GothicX]"->{120117},"\[GothicY]"->{120118},"\[GothicZ]"->{120119},"\[DoubleStruckA]"->{120146},"\[DoubleStruckB]"->{120147},"\[DoubleStruckC]"->{120148},"\[DoubleStruckD]"->{120149},"\[DoubleStruckE]"->{120150},"\[DoubleStruckF]"->{120151},"\[DoubleStruckG]"->{120152},"\[DoubleStruckH]"->{120153},"\[DoubleStruckI]"->{120154},"\[DoubleStruckJ]"->{120155},"\[DoubleStruckK]"->{120156},"\[DoubleStruckL]"->{120157},"\[DoubleStruckM]"->{120158},"\[DoubleStruckN]"->{120159},"\[DoubleStruckO]"->{120160},"\[DoubleStruckP]"->{120161},"\[DoubleStruckQ]"->{120162},"\[DoubleStruckR]"->{120163},"\[DoubleStruckS]"->{120164},"\[DoubleStruckT]"->{120165},"\[DoubleStruckU]"->{120166},"\[DoubleStruckV]"->{120167},"\[DoubleStruckW]"->{120168},"\[DoubleStruckX]"->{120169},"\[DoubleStruckY]"->{120170},"\[DoubleStruckZ]"->{120171},"\[DotlessJ]"->{567},"\[LightBulb]"->{128161},"\[NumberSign]"->{35},"\[WarningSign]"->{9888},"\[ScriptDotlessI]"->{120484},"\[ScriptDotlessJ]"->{120229},"\[DoubledPi]"->{8508},"\[DoubledGamma]"->{8509},"\[CapitalDifferentialD]"->{120123},"\[DifferentialD]"->{120149},"\[ExponentialE]"->{120150},"\[ImaginaryI]"->{120154},"\[ImaginaryJ]"->{120155},"\[FilledSmallCircle]"->{9679},"\[DottedSquare]"->{11034},"\[GraySquare]"->{9724},"\[GrayCircle]"->{9679},"\[LetterSpace]"->{95},"\[TripleDot]"->{8230},"\[SystemEnterKey]"->{91,69,78,84,69,82,93},"\[LeftSkeleton]"->{8810},"\[RightSkeleton]"->{8811},"\[ControlKey]"->{91,67,84,82,76,93},"\[AliasDelimiter]"->{8285},"\[InvisibleComma]"->{8203},"\[ReturnKey]"->{91,82,69,84,93},"\[AliasIndicator]"->{8285},"\[EscapeKey]"->{91,69,83,67,93},"\[CommandKey]"->{91,67,77,68,93},"\[InvisibleApplication]"->{8203},"\[ScriptCapitalA]"->{119964},"\[ScriptCapitalC]"->{119966},"\[ScriptCapitalD]"->{119967},"\[ScriptCapitalG]"->{119970},"\[ScriptCapitalJ]"->{119973},"\[ScriptCapitalK]"->{119974},"\[ScriptCapitalN]"->{119977},"\[ScriptCapitalO]"->{119978},"\[ScriptCapitalP]"->{119979},"\[ScriptCapitalQ]"->{119980},"\[ScriptCapitalS]"->{119982},"\[ScriptCapitalT]"->{119983},"\[ScriptCapitalU]"->{119984},"\[ScriptCapitalV]"->{119985},"\[ScriptCapitalW]"->{119986},"\[ScriptCapitalX]"->{119987},"\[ScriptCapitalY]"->{119988},"\[ScriptCapitalZ]"->{119989},"\[GothicCapitalA]"->{120068},"\[GothicCapitalB]"->{120069},"\[GothicCapitalD]"->{120071},"\[GothicCapitalE]"->{120072},"\[GothicCapitalF]"->{120073},"\[GothicCapitalG]"->{120074},"\[GothicCapitalJ]"->{120077},"\[GothicCapitalK]"->{120078},"\[GothicCapitalL]"->{120079},"\[GothicCapitalM]"->{120080},"\[GothicCapitalN]"->{120081},"\[GothicCapitalO]"->{120082},"\[GothicCapitalP]"->{120083},"\[GothicCapitalQ]"->{120084},"\[GothicCapitalS]"->{120086},"\[GothicCapitalT]"->{120087},"\[GothicCapitalU]"->{120088},"\[GothicCapitalV]"->{120089},"\[GothicCapitalW]"->{120090},"\[GothicCapitalX]"->{120091},"\[GothicCapitalY]"->{120092},"\[DoubleStruckCapitalA]"->{120120},"\[DoubleStruckCapitalB]"->{120121},"\[DoubleStruckCapitalC]"->{8450},"\[DoubleStruckCapitalD]"->{120123},"\[DoubleStruckCapitalE]"->{120124},"\[DoubleStruckCapitalF]"->{120125},"\[DoubleStruckCapitalG]"->{120126},"\[DoubleStruckCapitalH]"->{8461},"\[DoubleStruckCapitalI]"->{120128},"\[DoubleStruckCapitalJ]"->{120129},"\[DoubleStruckCapitalK]"->{120130},"\[DoubleStruckCapitalL]"->{120131},"\[DoubleStruckCapitalM]"->{120132},"\[DoubleStruckCapitalN]"->{8469},"\[DoubleStruckCapitalO]"->{120134},"\[DoubleStruckCapitalP]"->{8473},"\[DoubleStruckCapitalQ]"->{8474},"\[DoubleStruckCapitalR]"->{8477},"\[DoubleStruckCapitalS]"->{120138},"\[DoubleStruckCapitalT]"->{120139},"\[DoubleStruckCapitalU]"->{120140},"\[DoubleStruckCapitalV]"->{120141},"\[DoubleStruckCapitalW]"->{120142},"\[DoubleStruckCapitalX]"->{120143},"\[DoubleStruckCapitalY]"->{120144},"\[DoubleStruckCapitalZ]"->{8484},"\[TabKey]"->{91,84,65,66,93},"\[SpaceKey]"->{91,83,80,65,67,69,93},"\[DeleteKey]"->{91,68,69,76,93},"\[AltKey]"->{91,65,76,84,93},"\[OptionKey]"->{91,79,80,84,73,79,78,93},"\[KeyBar]"->{65112},"\[EnterKey]"->{91,69,78,84,69,82,93},"\[ShiftKey]"->{91,83,72,73,70,84,93},"\[Mod1Key]"->{91,77,79,68,49,93},"\[Mod2Key]"->{91,77,79,68,50,93},"\[LongEqual]"->{10869},"\[ConstantC]"->{120148},"\[DoubleStruckZero]"->{120792},"\[DoubleStruckOne]"->{120793},"\[DoubleStruckTwo]"->{120794},"\[DoubleStruckThree]"->{120795},"\[DoubleStruckFour]"->{120796},"\[DoubleStruckFive]"->{120797},"\[DoubleStruckSix]"->{120798},"\[DoubleStruckSeven]"->{120799},"\[DoubleStruckEight]"->{120800},"\[DoubleStruckNine]"->{120801},"\[GothicZero]"->{48},"\[GothicOne]"->{49},"\[GothicTwo]"->{50},"\[GothicThree]"->{51},"\[GothicFour]"->{52},"\[GothicFive]"->{53},"\[GothicSix]"->{54},"\[GothicSeven]"->{55},"\[GothicEight]"->{56},"\[GothicNine]"->{57},"\[ScriptZero]"->{48},"\[ScriptOne]"->{49},"\[ScriptTwo]"->{50},"\[ScriptThree]"->{51},"\[ScriptFour]"->{52},"\[ScriptFive]"->{53},"\[ScriptSix]"->{54},"\[ScriptSeven]"->{55},"\[ScriptEight]"->{56},"\[ScriptNine]"->{57},"\[NumberComma]"->{44}|>;
renderReplacements=Join[{"<"->"&lt;",">"->"&gt;","&"->"&amp;"," "->FromCharacterCode[{160}]},Normal@privateReplacements];
cssReplacements={"\""->"&quot;","'"->"&apos;"};
stringCharacterReplacements={"\\\\"->"\\","\\f"->"\f","\\n"->"\n","\\t"->"\t","\\\""->"\""};
mathSymbols="\[Limit]\[MaxLimit]\[MinLimit]\[Del]\[PartialD]\[DifferentialD]\[Conjugate]\[Transpose]\[ConjugateTranspose]\[HermitianConjugate]\[And]\[Or]\[Xor]\[Nand]\[Nor]\[Xnor]\[Equal]\[LongEqual]\[Distributed]\[Rule]\[RuleDelayed]\[Implies]\[LeftRightArrow]\[Function]\[DirectedEdge]\[UndirectedEdge]\[Piecewise]";
mathSymbolsSmall="\[Prime]";
mathSymbolsLarge="\[Sum]\[Product]\[Integral]\[ContourIntegral]\[DoubleContourIntegral]\[CounterClockwiseContourIntegral]\[ClockwiseContourIntegral]";
mathSymbolReplacements=MapAt[FromCharacterCode,{
  "\[Limit]"->{16^^e100},"\[MaxLimit]"->{16^^e101},"\[MinLimit]"->{16^^e102},"\[Del]"->{16^^e103},"\[PartialD]"->{16^^e104},
  "\[DifferentialD]"->{16^^e105},"\[Conjugate]"->{16^^e10d},"\[Transpose]"->{16^^e10e},"\[ConjugateTranspose]"->{16^^e10f},"\[HermitianConjugate]"->{16^^e110},
  "\[And]"->{16^^e112},"\[Or]"->{16^^e113},"\[Xor]"->{16^^e114},"\[Nand]"->{16^^e115},"\[Nor]"->{16^^e116},"\[Xnor]"->{16^^e117},
  "\[Equal]"->{16^^e118},"\[LongEqual]"->{16^^e119},"\[Distributed]"->{16^^e11a},
  "\[Rule]"->{16^^e11b},"\[RuleDelayed]"->{16^^e11c},"\[Implies]"->{16^^e11d},"\[LeftRightArrow]"->{16^^e11e},"\[Function]"->{16^^e11f},"\[DirectedEdge]"->{16^^e120},"\[UndirectedEdge]"->{16^^e121},
  "\[Piecewise]"->{16^^e122},
  
  "\[Prime]"->{16^^e111},
  
  "\[Sum]"->{16^^e106},"\[Product]"->{16^^e107},"\[Integral]"->{16^^e108},"\[ContourIntegral]"->{16^^e109},"\[DoubleContourIntegral]"->{16^^e10a},
  "\[CounterClockwiseContourIntegral]"->{16^^e10b},"\[ClockwiseContourIntegral]"->{16^^e10c}
},{;;,2}];


ClearAll[renderWrapper,renderHTML,renderHTMLimpl,htmlClass,htmlStyle,htmlColor];


$statestack=<||>;
$inheritedStyle=<||>;
$localStyle=<||>;

localStyleNames=<|
  RowBox->{},
  SqrtBox->{SurdForm},
  RadicalBox->{SurdForm},
  FrameBox->{Background,FrameMargins,ImageMargins,RoundingRadius},
  StyleBox->{TextAlignment,FontFamily,FontSize,FontWeight,FontSlant,FontTracking,FontVariations,FontColor,FontOpacity,Background},
  PaneBox->{ImageSize},
  GridBox->{GridBoxFrame}
|>;
inheritedStyleNames=<|
  RowBox->{},
  StyleBox->{ShowStringCharacters,SingleLetterItalics},
  PaneBox->{}
|>;
handleStyles[head_,styles_]:=Module[{keys},
  keys=Keys[styles];
  $localStyle=KeyTake[styles,Intersection[keys,Lookup[localStyleNames,head,{}]]];
  {KeyTake[styles,#],AssociationThread[#->Lookup[$inheritedStyle,#,Missing[]]]}&@Intersection[keys,Lookup[inheritedStyleNames,head,{}]]
];

SetAttributes[renderWrapper,HoldAll];
renderWrapper[state_Association,styles_,expr_]:=Module[{return,stateModifier,pop},
  stackPush[$statestack,Join[<|"head"->Null,"mutable"->False,"bracket"->False|>,<|"head"->state["head"]|>]];
  If[Length[styles]==0,$localStyle=<||>;,
    stateModifier=handleStyles[state["head"],styles];
    AssociateTo[$inheritedStyle,stateModifier[[1]]];
  ];
  (*Echo[{styles,$localStyle,$inheritedStyle,$statestack}];*)
  return=expr;
  If[Length[styles]==0,$localStyle=<||>;,
    AssociateTo[$inheritedStyle,Select[stateModifier[[2]],Not@*MissingQ]];
    KeyDropFrom[$inheritedStyle,Keys@Select[stateModifier[[2]],MissingQ]];
  ];
  pop=stackPop[$statestack];
  If[pop["mutable"]===True&&Length[$statestack]>0,Null(*$statestack[[-1,"mutable"]]=True*)];
  return
];
renderWrapper[head_Symbol,styles_,expr_]:=renderWrapper[<|"head"->head|>,styles,expr];

htmlClass[names_List]:=If[Length[names]>0,StringRiffle[names,{" class=\""," ","\""}],""];
orNothing[pred_,val_]:=If[pred,val,Nothing];
mutableClassName:=orNothing[$statestack[[-1,"mutable"]],"mutable"];

htmlStyle[styles_]:=If[Length[#]>0," style=\""<>#<>"\"",""]&@KeyValueMap[If[StringLength[#2]>0,#1<>":"<>#2<>";",Nothing]&,styles];
htmlColor[color_]:=If[Head[#]===RGBColor,"#"<>IntegerString[Round[255.(List@@#)],16,2],""]&[Quiet@ColorConvert[color,"RGB"]];

renderHTMLescape[str_String]:=StringReplace[str,renderReplacements];
renderHTMLescape[str_]:=renderHTMLescape[ToString[str]];
renderHTMLimpl[str_String]:=Which[
  str=="",
    "<w></w>",
  StringLength[str]==1,
    Which[
      StringContainsQ["()[]{}\[LeftCeiling]\[RightCeiling]\[LeftFloor]\[RightFloor]\[LeftDoubleBracket]\[RightDoubleBracket]\[LeftAngleBracket]\[RightAngleBracket]\[LeftAssociation]\[RightAssociation]\[LeftBracketingBar]\[RightBracketingBar]\[LeftDoubleBracketingBar]\[RightDoubleBracketingBar]\[Conditioned]\[VerticalSeparator]\[Piecewise]",str],
        If[$statestack[[-1,"head"]]===RowBox,
          "<wb>"<>str<>"</wb>",
          "<w>"<>str<>"</w>"
        ],
      StringContainsQ[mathSymbols,str],
        "<w class=\"symbol\">"<>StringReplace[str,mathSymbolReplacements]<>"</w>",
      StringContainsQ[mathSymbolsSmall,str],
        "<w class=\"small-symbol\">"<>StringReplace[str,mathSymbolReplacements]<>"</w>",
      StringContainsQ[mathSymbolsLarge,str],
        "<w class=\"large-symbol\">"<>StringReplace[str,mathSymbolReplacements]<>"</w>",
      str==" ",
        "<w></w>",
      TrueQ@Lookup[$inheritedStyle,SingleLetterItalics,False]&&(65<=#<=90||97<=#<=122&@ToCharacterCode[str][[1]]),
        "<w class=\"italic\">"<>str<>"</w>",
      True,
        "<w>"<>renderHTMLescape[str]<>"</w>"
    ],
  StringTake[str,1]=="\[Prime]"&&StringMatchQ[str,"\[Prime]"..],
    "<w class=\"small-symbol\">"<>StringRepeat[StringReplace["\[Prime]",mathSymbolReplacements],StringLength[str]]<>"</w>",
  True,
    Which[
      StringTake[str,{{1},{-1}}]=={"\"","\""}&&Lookup[$inheritedStyle,ShowStringCharacters,False]===False,
        "<w>"<>StringReplace[renderHTMLescape@StringReplace[StringTake[str,{2,-2}],stringCharacterReplacements],"\n"->"</w><br/><w>"]<>"</w>",
      3<=StringLength[str]<=27&&StringContainsQ[str,"`"]&&StringContainsQ["0123456789",StringTake[str,1]],
        If[StringQ[#],
          "<w>"<>StringTake[#,{2,-2}]<>"</w>",
          "<wsup><w></w><w>"<>StringTake[#[[1,1]],{2,-2}]<>"&#215;10</w><w><w>"<>StringTake[#[[1,3,2]],{2,-2}]<>"</w></w></wsup>"
        ]&[If[$numberFormHasStyleBox,#[[1,1,1]],#[[1,1]]]&@ToBoxes[NumberForm[ToExpression@str]]],
      True,
        "<w>"<>renderHTMLescape[str]<>"</w>"
    ]
];

renderHTMLimpl[FractionBox[x_,y_,___]]:=renderWrapper[<|"head"->FractionBox|>,<||>,
  TemplateApply["<wfrac`3`><w>`1`</w><w><w></w><w>`2`</w></w></wfrac>",
    {renderHTMLimpl[x],renderHTMLimpl[y],htmlClass@{mutableClassName,orNothing[!FreeQ[$statestack[[;;-2,"head"]],FractionBox],"script"]}}]]

renderHTMLimpl[RowBox[{"Association","[",args___,"]"},opt___]]:=renderHTMLimpl[RowBox[{"\[LeftAssociation]",args,"\[RightAssociation]"},opt]];
renderHTMLimpl[RowBox[list_List,opt___]]:=Module[{openFirsts,closeFirst,possiblePairs=0,pair=Null},
  openFirsts=FirstPosition[list,#,{Infinity},{1}][[1]]&/@{"[","\[LeftDoubleBracket]","("};
  If[1<Min[openFirsts]<Infinity,
    possiblePairs=Ordering[openFirsts];
    Do[
      If[openFirsts[[p]]==Infinity,Break[];];
      closeFirst=FirstPosition[list[[openFirsts[[p]]+1;;]],{"]","\[RightDoubleBracket]",")"}[[p]],{Infinity},{1}][[1]];
      If[closeFirst<Infinity,closeFirst+=openFirsts[[p]];pair={p,openFirsts[[p]],closeFirst};Break[];];
    ,{p,possiblePairs}];
  ];
  If[pair===Null,
    renderWrapper[RowBox,<||>,
      StringJoin["<wrow",#2,"><w></w>",#1,"</wrow>"]&[
        renderHTMLimpl/@list,
        htmlClass@{
        mutableClassName,
        orNothing[$statestack[[-1,"bracket"]],"bracket"]
      }]
    ],
    renderHTMLimpl[
      RowBox[Join[
        list[[;;pair[[2]]-1]],
        {RowBox[Join[{{"[","\[LeftDoubleBracket]","("}[[pair[[1]]]]},list[[pair[[2]]+1;;pair[[3]]-1]],{{"]","\[RightDoubleBracket]",")"}[[pair[[1]]]]}]]},
        list[[pair[[3]]+1;;]]
      ],opt]
    ]
  ]
]


renderHTMLimpl[SuperscriptBox[x_,y_,___]]:=renderWrapper[<|"head"->SuperscriptBox,"mutable"->True|>,<||>,
  TemplateApply["<wsup><w></w>`1`<w>`2`</w></wsup>",{renderHTMLimpl[x],renderHTMLimpl[y]}]]

renderHTMLimpl[SubscriptBox[x_,y_,___]]:=renderWrapper[<|"head"->SubscriptBox,"mutable"->True|>,<||>,
  TemplateApply["<wsub><w></w>`1`<w>`2`</w></wsub>",{renderHTMLimpl[x],renderHTMLimpl[y]}]]

renderHTMLimpl[SubsuperscriptBox[x_,y_,z_,___]]:=renderWrapper[<|"head"->SubsuperscriptBox,"mutable"->True|>,<||>,
  TemplateApply["<wsubsup><w></w>`1`<w>`3`<w></w>`2`</w></wsubsup>",{renderHTMLimpl[x],renderHTMLimpl[y],renderHTMLimpl[z]}]]

renderHTMLimpl[OverscriptBox[x_,y_,___]]:=renderWrapper[OverscriptBox,<||>,
  TemplateApply["<wover`3`><w>`2`</w>`1`</wover>",{renderHTMLimpl[x],renderHTMLimpl[y],htmlClass[{mutableClassName}]}]]

renderHTMLimpl[UnderscriptBox[x_,y_,___]]:=renderWrapper[UnderscriptBox,<||>,
  TemplateApply["<wunder`3`>`1`<w>`2`</w></wunder>",{renderHTMLimpl[x],renderHTMLimpl[y],htmlClass[{mutableClassName}]}]]

renderHTMLimpl[UnderoverscriptBox[x_,y_,z_,___]]:=renderWrapper[UnderoverscriptBox,<||>,
  TemplateApply["<wunderover`4`><w>`3`</w><w>`1`<w>`2`</w></w></wunderover>",
    {renderHTMLimpl[x],renderHTMLimpl[y],renderHTMLimpl[z],htmlClass[{mutableClassName}]}]]

renderHTMLimpl[SqrtBox[x_,opt___]]:=renderWrapper[<|"head"->SqrtBox,"mutable"->True|>,<|opt|>,
  TemplateApply["<wsqrt><w><w>\\</w></w><w></w><w>`2`</w>`1`</wsqrt>",
    {If[TrueQ@Lookup[$localStyle,SurdForm,False],"<w></w>",""],renderHTMLimpl[x]}]]

renderHTMLimpl[RadicalBox[x_,y_,opt___]]:=renderWrapper[<|"head"->RadicalBox,"mutable"->True|>,<|opt|>,
  TemplateApply["<wsqrt><w><w>\\</w><w>`3`</w></w><w></w><w>`2`</w>`1`</wsqrt>",
    {If[TrueQ@Lookup[$localStyle,SurdForm,False],"<w></w>",""],renderHTMLimpl[x],renderHTMLimpl[y]}]]

renderHTMLimpl[GridBox[{{"\[Piecewise]",rest_}},___]]:=renderHTMLimpl[RowBox[{"\[Piecewise]",rest}]]
renderHTMLimpl[
  GridBox[x_/;MatchQ[Dimensions[x,2,AllowedHeads->List],{_?Positive,_?Positive}],opts___]
]:=renderWrapper[GridBox,<|opts|>,
  Module[{dims=Dimensions[x,2],spanToBottom,spanToRight,visited,spanStyle,maxCol,maxRow,cellHTML,frame},
    spanToBottom=ArrayPad[Map[#==="\[SpanFromAbove]"||#==="\[SpanFromBoth]"&,x,{2}],{{0,1},{0,0}},False][[2;;]];
    spanToRight=ArrayPad[Map[#==="\[SpanFromLeft]"||#==="\[SpanFromBoth]"&,x,{2}],{{0,0},{0,1}},False][[;;,2;;]];
    visited=ConstantArray[False,dims];
    spanStyle=htmlStyle[AssociationThread[{"grid-row-start","grid-row-end","grid-column-start","grid-column-end"}->(ToString/@#)]]&;
    frame=Which[
      MissingQ[#],"",
      #==={"ColumnsIndexed"->{{{1,-1},{1,-1}}->True}},"outer",
      #==={"Columns"->{{True}},"Rows"->{{True}}},"all",
      True,""
    ]&@$localStyle[GridBoxFrame];
    cellHTML=Table[
      Which[
        visited[[row,col]],
          Nothing,
        !spanToBottom[[row,col]]&&!spanToRight[[row,col]],
          (* no span in either direction *)
          "<w>"<>renderHTMLimpl[x[[row,col]]]<>"</w>",
        !spanToRight[[row,col]],
          (* only span vertically *)
          maxRow=NestWhile[#+1&,row,spanToBottom[[#,col]]&];
          visited[[row;;maxRow,col]]=True;
          "<w"<>spanStyle[{row,maxRow+1,col,col+1}]<>">"<>renderHTMLimpl[x[[row,col]]]<>"</w>",
        !spanToBottom[[row,col]],
          (* only span horizontally *)
          maxCol=NestWhile[#+1&,col,spanToRight[[row,#]]&];
          visited[[row,col;;maxCol]]=True;
          "<w"<>spanStyle[{row,row+1,col,maxCol+1}]<>">"<>renderHTMLimpl[x[[row,col]]]<>"</w>",
        True,
          (* possibly span in both directions *)
          maxCol=NestWhile[#+1&,col,spanToRight[[row,#]]&];
          maxRow=NestWhile[#+1&,row,And@@spanToBottom[[#,col;;maxCol]]&];
          visited[[row;;maxRow,col;;maxCol]]=True;
          "<w"<>spanStyle[{row,maxRow+1,col,maxCol+1}]<>">"<>renderHTMLimpl[x[[row,col]]]<>"</w>"
      ]
    ,{row,1,dims[[1]]}
    ,{col,1,dims[[2]]}];
    StringJoin["<wgrid",
      htmlClass[{
        mutableClassName,
        If[frame==="outer","outer-frame",Nothing],
        If[frame==="all","all-frame",Nothing]
      }],
      " style=\"grid-template-columns:repeat(",ToString@Dimensions[x,2][[2]],",max-content);\">",
      #,"</wgrid>"
    ]&@Flatten[cellHTML,1]
  ]
];

(* ignore ItemBox for now *)
renderHTMLimpl[ItemBox[x_,opts___]]:=renderWrapper[ItemBox,<||>,
  renderHTMLimpl[x]]

frameBoxStyleHandlers=<|
  "Background"->("background-color"->htmlColor[#]&),
  "FrameMargins"->("padding"->Switch[#,_Real|_Integer,ToString[#,CForm]<>"pt",_,""]&),
  "ImageMargins"->("margin"->Switch[#,_Real|_Integer,ToString[#,CForm]<>"pt",_,""]&),
  "RoundingRadius"->("border-radius"->Switch[#,_Real|_Integer,ToString[#,CForm]<>"pt",_,""]&)
|>;

renderHTMLimpl[FrameBox[x_,opts___]]:=renderWrapper[FrameBox,<|opts|>,
  TemplateApply["<wframe`3``1`>`2`</wframe>",{
    htmlStyle@Merge[KeyValueMap[frameBoxStyleHandlers[ToString[#1]][#2]&,$localStyle],Last],
    renderHTMLimpl[x],
    htmlClass[{mutableClassName}]}]]

renderHTMLimpl[TagBox[x_,___]]:=renderWrapper[TagBox,<||>,
  renderHTMLimpl[x]]

renderHTMLimpl[TooltipBox[x_,tag_,opts___]]:=renderWrapper[TooltipBox,<||>,
  TemplateApply["<w title=\"`2`\">`1`</w>",{
    renderHTMLimpl[x],
    StringReplace[
      If[StringLength[#]<=500,#,StringTake[#,500]<>"..."]&@
      If[((TooltipStyle/.{opts})==="TextStyling"||(LabelStyle/.{opts})==="TextStyling")&&StringLength[#]>=2,StringTake[#,{2,-2}],#]&@
        StringTake[ToString[ToExpression[tag,StandardForm,HoldAllComplete],InputForm],{17,-2}],
      {"<"->"&lt;",">"->"&gt;","&"->"&amp;","\""->"&quot;","'"->"&#39;"}
    ]
  }]]
  
styleBoxStylesRules={
  x_?ColorQ:>(FontColor->ColorConvert[x,"RGB"]),
  Bold->(FontWeight->Bold),
  Italic->(FontSlant->Italic),
  Underlined->(FontVariations->{"Underline"->True}),
  x:(Larger|Smaller|_Integer|_Real):>(FontSize->x),
  x:(_->_):>x,
  _:>Nothing
};
styleBoxFontVariationRules={
  ("CapsType"->x_):>("font-variant"->Switch[x,"Normal","normal","SmallCaps","small-caps",_,""]),
  ("StrikeThrough"->x_):>("text-decoration"->Switch[x,True,"line-through",_,""]),
  ("Underline"->x_):>("text-decoration"->Switch[x,True,"underline",_,""]),
  _:>Nothing
};
styleBoxStyleHandlers=<|
  "TextAlignment"->("text-align"->Switch[#,_,"",Left,"left",Right,"right",Center,"center",_,""]&),
  "FontFamily"->("font-family"->StringReplace[StringJoin["\"",ToString[#],"\""],cssReplacements]&),
  "FontSize"->("font-size"->Switch[#,Larger,"125%",Smaller,"80%",_?Positive,ToString[#,CForm]<>"pt",_,""]&),
  "FontWeight"->("font-weight"->Switch[#,Plain,"normal",Bold,"bold",_,""]&),
  "FontSlant"->("font-style"->Switch[#,Plain,"normal",Italic,"italic",_,""]&),
  "FontTracking"->("letter-spacing"->Switch[#,Plain|"Plain","normal","Condensed","-0.1ch","Extended","0.1ch",_,""]&),
  "FontVariations"->(Merge[Replace[Flatten[#],styleBoxFontVariationRules,{1}],StringRiffle@*DeleteCases[""]]&),
  "FontColor"->("color"->htmlColor[#]&),
  "FontOpacity"->("opacity"->Switch[#,_Real|_Integer,ToString[#,CForm],_,""]&),
  "Background"->("background-color"->htmlColor[#]&)
|>;
renderHTMLimpl[StyleBox[x_,opts___]]:=renderWrapper[StyleBox,<|Replace[Flatten@{opts},styleBoxStylesRules,{1}]|>,
  TemplateApply["<wrow`3``1`><w></w>`2`</wrow>",{
    htmlStyle@Merge[KeyValueMap[styleBoxStyleHandlers[ToString[#1]][#2]&,$localStyle],Last],
    renderHTMLimpl[x],
    htmlClass@{mutableClassName}
  }]]

paneBoxStyleHandlers=<|
  "ImageSize"->(AssociationThread[{"width","height"}->
    Replace[
      If[Head[#]===List,PadRight[#,2,All],{#,All}],
      {x:(_Integer|_Real):>ToString[x,CForm]<>"pt",_->""},
      {1}
    ]]&)
|>;
renderHTMLimpl[PaneBox[x_,opts___]]:=renderWrapper[PaneBox,<|opts|>,
  TemplateApply["<wpane`3``1`>`2`</wpane>",{
    htmlStyle@Merge[KeyValueMap[paneBoxStyleHandlers[ToString[#1]][#2]&,Echo@$localStyle],Last],
    renderHTMLimpl[x],
    htmlClass@{mutableClassName}
  }]]

renderHTMLimpl[FormBox[x_,form_,opts___]]:=renderWrapper[FormBox,<||>,
  renderHTMLimpl[StyleBox[x,Sequence@@If[form===TraditionalForm,{SingleLetterItalics->True,FontFamily->"Times"},{}],opts]]]

renderHTMLimpl[x_TemplateBox]:=renderWrapper[TemplateBox,<||>,
  renderHTMLimpl[BoxForm`TemplateBoxToDisplayBoxes[x]]]

renderHTMLimpl[InterpretationBox[x_,___]]:=renderWrapper[InterpretationBox,<||>,
  renderHTMLimpl[x]]

renderHTMLimpl[x_GraphicsBox]:=renderWrapper[<|"head"->GraphicsBox,"mutable"->True|>,<||>,
  renderHTMLimage[x,True]]

renderHTMLimpl[x_Graphics3DBox]:=renderWrapper[<|"head"->Graphics3DBox,"mutable"->True|>,<||>,
  renderHTMLimage[x,True]]

rasterizeAsImage[boxes_]:=Module[{expr=RawBoxes[boxes],black,white,alpha,image},
  If[!TrueQ@$getKernelConfig["imageWithTransparency"],
    Rasterize[expr],
    black=ImageData@Rasterize[expr,Background->Black];
    white=ImageData@Rasterize[expr,Background->White];
    alpha=Clip[1.-(1./3)(Total[white,{3}]-Total[black,{3}]),{0.,1.}];
    image=0.5*(1.0-(1.0-white)/#)+0.5*(black/#)&[Transpose[ConstantArray[Clip[alpha,{0.001,1.0}],3],{3,1,2}]];
    logWrite["The image was rasterized with transparency"];
    SetAlphaChannel[Image[Clip[image,{0.,1.}]],Image[alpha]]
  ]
]
renderHTMLimage[x_,resizable_:True]:=Module[{img=rasterizeAsImage[x],dim},
  dim=ImageDimensions[img];
  StringJoin["<wgraph ",
    If[TrueQ[resizable],"class=\"resizable\" ",""],
    "style=\"width:",ToString@dim[[1]],"px;height:",ToString@dim[[2]],"px;\" ",
    "aspect-ratio=\"",TextString[N[dim[[2]]/dim[[1]]]],"\" ",
    "tabIndex=\"-1\"><img src=\"data:image/png;base64,",
    ExportString[img,{"Base64","PNG"}],
    "\" /></wgraph>"
  ]
];
  
renderHTMLimpl[x_]:=renderWrapper[<|"head"->Head[x]|>,<||>,
  renderHTMLimage[x]
  (*StringJoin["<wunknown title=\"This expression cannot be rendered.\">",renderHTMLescape@ToString[Head[x],InputForm],"</wunknown>"]*)];

renderHTMLimpl[renderingFailed[reason_String]]:=renderWrapper[<|"head"->""|>,<||>,
  StringJoin["<wfailed title=\"", reason, "\">","Rendering failed","</wfailed>"]];

renderHTML[expr_]:=renderWrapper[Expression,<||>,
    StringJoin["<div class=\"wexpr\">",renderHTMLimpl[expr],"</div>"]]

renderImage[expr_]:=renderWrapper[Expression,<||>,
    StringJoin["<div class=\"wexpr\">",renderHTMLimage[expr],"</div>"]]

