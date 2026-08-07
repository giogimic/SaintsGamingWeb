package main

import (
	"fmt"
	"net/http"
	"github.com/zishang520/engine.io/v2/types"
	"github.com/zishang520/socket.io/v2/socket"
)

func main() {
	opts := socket.DefaultServerOptions()
	opts.SetCors(&types.Cors{Origin: true, Credentials: true})
	io := socket.NewServer(nil, opts)
	
	http.Handle("/socket.io/", io.ServeHandler(nil))
	go http.ListenAndServe(":8888", nil)
	fmt.Println("Server running. Run: curl -H 'Origin: https://saintsgaming.net' -v http://localhost:8888/socket.io/?EIO=4\\&transport=polling")
	select {}
}
