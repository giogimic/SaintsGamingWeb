package world

import (
	"fmt"
	"log"
	"sync"
)

// ChunkGenerationRequest represents a job for the worker pool.
type ChunkGenerationRequest struct {
	CX, CY, CZ int
	Config     GeneratorConfig
	Callback   func(*VoxelChunk)
}

// WorkerPool manages Goroutines for generating procedural chunks asynchronously.
type WorkerPool struct {
	JobQueue chan ChunkGenerationRequest
	wg       sync.WaitGroup
	workers  int
	quit     chan struct{}
}

// NewWorkerPool creates a new worker pool for terrain generation.
func NewWorkerPool(numWorkers int, maxQueue int) *WorkerPool {
	return &WorkerPool{
		JobQueue: make(chan ChunkGenerationRequest, maxQueue),
		workers:  numWorkers,
		quit:     make(chan struct{}),
	}
}

// Start spins up the Goroutines.
func (wp *WorkerPool) Start() {
	log.Printf("[World WorkerPool] Starting %d workers", wp.workers)
	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go func(workerID int) {
			defer wp.wg.Done()
			for {
				select {
				case job := <-wp.JobQueue:
					chunk := GenerateProceduralChunk(job.CX, job.CY, job.CZ, job.Config)
					if job.Callback != nil {
						job.Callback(chunk)
					}
				case <-wp.quit:
					return
				}
			}
		}(i)
	}
}

// Stop gracefully shuts down the worker pool.
func (wp *WorkerPool) Stop() {
	close(wp.quit)
	wp.wg.Wait()
	close(wp.JobQueue)
	log.Println("[World WorkerPool] Stopped gracefully.")
}

// Submit enqueues a generation job. Non-blocking if the queue has space, blocks if full.
func (wp *WorkerPool) Submit(req ChunkGenerationRequest) error {
	select {
	case wp.JobQueue <- req:
		return nil
	default:
		// Queue is full
		return fmt.Errorf("chunk generation queue is full")
	}
}
