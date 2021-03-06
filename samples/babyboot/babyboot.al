%% Fourbar with Constraint Stabilization

NewtonianFrame N
RigidBody A,B

variable qA'', qB''
constant La, Lb
constant mA, mB,
constant Ia, IBx, Iby, Ibz
constant g

A.setMass(mA)
A.setInertia(Acm, Ia, 0, 0)

B.setMass(mB)
B.setInertia(Bcm, IBx, IBy, IBz)


A.rotateX(N,  qA)
B.rotateZ(A,  qB)

Acm.translate(No, -La*az>)
Ao.translate(Acm, 0>)

Bcm.translate(No, -Lb*az>)
Bo.translate(Bcm, 0>)

System.AddForceGravity( -g*nz>)

EoM> = System.getDynamics(No)
EoM[1] = dot(EoM>,  nx>)
EoM[2] = dot(EoM>,  bz>)

solve(EoM, qA'', qB'')

input g = 9.81 m/sec^2
input La = 7.5 cm, Lb = 20 cm
input mA = 0.01 kg, mB = 0.1 kg
input Ia = 0.05 kg*cm^2
input IBx = 2.5 kg*cm^2, IBy = 0.5 kg*cm^2, IBz = 2.0 kg*cm^2
input qA  = 45 degrees, qB  = 0.5 degrees
input qA' = 0, qB' = 0

input integStp = 0.05, tFinal = 10

animate(N, No, A, B) 
ode() stable/babyboot



