function showWorldAxis(size) {
    var makeTextPlane = function(text, color, size) {
        var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
        dynamicTexture.hasAlpha = true;
        dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
        var plane = BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
        plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
        plane.material.backFaceCulling = false;
        plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
        plane.material.diffuseTexture = dynamicTexture;
    return plane;
     };
    var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
      BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
      ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    var xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
    var axisY = BABYLON.Mesh.CreateLines("axisY", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
        ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    var yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
    var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
        ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    var zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
};



function placeCylinder(cylinder, vStart, vEnd, r) {
    const distance = BABYLON.Vector3.Distance(vStart,vEnd )
    BABYLON.Vector3.LerpToRef(vStart,vEnd,0.5,cylinder.position)       
    cylinder.scaling.set(r,distance,r)

    const delta = vEnd.subtract(vStart).scale(1.0/distance)
    const up = new BABYLON.Vector3(0, 1, 0)
    let angle = Math.acos(BABYLON.Vector3.Dot(delta, up));
    let quaternion
    if(Math.abs(angle) > 0.00001) {
        const axis = BABYLON.Vector3.Cross( up, delta).normalize()
        quaternion = BABYLON.Quaternion.RotationAxis(axis, angle);    
    } else quaternion = BABYLON.Quaternion.Identity()
    cylinder.rotationQuaternion = quaternion
}

class GeometricModel {
    constructor(name = "model") {
        this.name = name
        let pivot = this.pivot = new BABYLON.Mesh(name+"-pivot", scene)

        let dot = this.dot = BABYLON.MeshBuilder.CreateSphere(name+'-dot', {diameter:2}, scene)
        let mat = dot.material = new BABYLON.StandardMaterial(name+'dot-mat', scene)
        mat.diffuseColor.set(0.6,0.1,0.7)
        dot.parent = pivot
        this.vertices = [dot]
        dot.visibility = 0
        this.usedVertices = 0

        let edge = this.edge = BABYLON.MeshBuilder.CreateCylinder(name+'-edge', {diameter:2, height:1}, scene)
        mat = edge.material = new BABYLON.StandardMaterial(name+'edge-mat', scene)
        mat.diffuseColor.set(0.6,0.6,0.6)
        edge.parent = pivot
        this.edges = [edge]
        edge.visibility = 0
        this.usedEdges = 0

        let facesMesh = this.facesMesh = new BABYLON.Mesh(name+'-faces', scene)
        facesMesh.parent = pivot
        mat = facesMesh.material = new BABYLON.StandardMaterial(name+'faces-mat', scene)
        mat.backFaceCulling = false
        mat.diffuseColor.set(0.6,0.8,0.2)
        // mat.alpha = 0.5
    }

    beginUpdate() {
        this.usedVertices = 0
        this.usedEdges = 0
        this.faces = { positions:[], indices:[], vCount:0, fCount:0 }
    }
    endUpdate() {
        if(this.usedVertices == 0) this.dot.visibility = 0
        else this.dot.visibility = 1
        for(let i = this.vertices.length - 1; i>=this.usedVertices && i>0; i--) {
            this.vertices[i].dispose()
        }
        if(this.vertices.length > this.usedVertices) {
            this.vertices.splice(this.usedVertices, this.vertices.length - this.usedVertices)
        }
        if(this.usedEdges == 0) this.edge.visibility = 0
        else this.edge.visibility = 1
        for(let i = this.edges.length - 1; i>=this.usedEdges && i>0; i--) {
            this.edges[i].dispose()
        }
        if(this.edges.length > this.usedEdges) {
            this.edges.splice(this.usedEdges, this.edges.length - this.usedEdges)
        }
        if(this.faces.fCount == 0) this.facesMesh.visibility = 0
        else {
            var vertexData = new BABYLON.VertexData();
            vertexData.positions = this.faces.positions
            vertexData.indices = this.faces.indices
            vertexData.applyToMesh(this.facesMesh);
            this.facesMesh.visibility = 1
        }
    }
    addVertex(pos, r) {
        let i = this.usedVertices++
        while(this.vertices.length <= i) {
            const name = this.name+'-dot-inst-'+this.vertices.length
            let instance = this.dot.createInstance(name)
            instance.parent = this.pivot
            this.vertices.push(instance)
        }
        const v = this.vertices[i]
        v.scaling.set(r,r,r)
        v.position.copyFrom(pos)
        return i        
    }
    addEdge(pa,pb,r) {
        let i = this.usedEdges++
        while(this.edges.length <= i) {
            const name = this.name+'-edge-inst-'+this.edges.length
            let instance = this.edge.createInstance(name)
            instance.parent = this.pivot
            this.edges.push(instance)
        }
        placeCylinder(this.edges[i], pa, pb, r)
        return i
    }
    addFace(pts) {
        const m = pts.length
        const k = this.faces.vCount
        const {positions, indices} = this.faces
        pts.forEach(p => { positions.push(p.x,p.y,p.z) })
        for(let i=2; i<m; i++) { indices.push(k, k+i-1, k+i) }
        this.faces.vCount += m
        this.faces.fCount ++
    }
}