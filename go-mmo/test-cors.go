package main

import (
	"fmt"
	"github.com/zishang520/engine.io/v2/types"
)

func main() {
	cors := &types.Cors{Origin: true}
	fmt.Printf("Cors origin: %v\n", cors.Origin)
}
