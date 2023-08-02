(*  wolframscript -f resources/compress-init.wl *)
Print[Directory[]]

"./resources/init.wl" //
ReadString //
Compress //
WriteString["./resources/init-compressed.txt", #]&
