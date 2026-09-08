package world

// ScheduledVoxel represents a voxel block scheduled for an update tick (e.g. falling sand, flowing water).
type ScheduledVoxel struct {
	InstanceID string
	X, Y, Z    int
	ExecuteAt  int64 // Unix milliseconds
	index      int   // heap index internally maintained by container/heap
}

// VoxelQueue implements heap.Interface and holds ScheduledVoxels.
type VoxelQueue []*ScheduledVoxel

func (vq VoxelQueue) Len() int { return len(vq) }

func (vq VoxelQueue) Less(i, j int) bool {
	// Min-heap: lowest ExecuteAt (earliest time) pops first
	return vq[i].ExecuteAt < vq[j].ExecuteAt
}

func (vq VoxelQueue) Swap(i, j int) {
	vq[i], vq[j] = vq[j], vq[i]
	vq[i].index = i
	vq[j].index = j
}

func (vq *VoxelQueue) Push(x any) {
	n := len(*vq)
	item := x.(*ScheduledVoxel)
	item.index = n
	*vq = append(*vq, item)
}

func (vq *VoxelQueue) Pop() any {
	old := *vq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil  // avoid memory leak 
	item.index = -1 // for safety
	*vq = old[0 : n-1]
	return item
}
