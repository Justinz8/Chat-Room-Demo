import Popup from "reactjs-popup";
import "./UploadPFP.css";

import { useEffect, useRef, useState } from "react";

import { uploadFormData } from "../../CustomHooks";

import { getImageSize } from "react-image-size";

export default function UploadPFP() {
    const Upload = uploadFormData("http://localhost:3000");

    function UploadPFPBody() {
        const [PFPSize, SetPFPSize] = useState<number>(100);

        const [PFPPos, SetPFPPos] = useState<{ X: number; Y: number }>({
            X: 0,
            Y: 0,
        });

        const PFPElement = useRef<null | HTMLDivElement>(null);

        const PFP = useRef<null | HTMLInputElement>(null);

        const [PFPSample, SetPFPSample] = useState<string>(""); //URL of PFP

        const [PFPDim, SetPFPDim] = useState<{ width: number; height: number }>(
            {
                width: 0,
                height: 0,
            }
        );

        useEffect(() => {
            //Given a scroll, change the size of the image based off its scroll Y vector
            function wheelEvent(ev: WheelEvent) {
                SetPFPSize((x) => {
                    let newVal = Math.max(
                        x + ((ev.deltaY / -50) * x) / 100,
                        100
                    );
                    newVal = Math.max(
                        (PFPDim.width / PFPDim.height) * 100,
                        newVal
                    );
                    SetPFPPos((x) => PosBound(x, newVal));
                    return newVal;
                });
            }

            //initial positioning before drag starts
            var InitialPFPPos = PFPPos;

            //initial offset from beginning of dragging
            var InitialOffset = {
                X: 0,
                Y: 0,
            };

            //returns a bounded X Y offset based on zoom and dimensions of image
            //has a newSize property in case size state has been updated beforehand
            function PosBound(
                { X, Y }: { X: number; Y: number },
                newSize?: number
            ) {
                if (!PFPElement.current) return { X: 0, Y: 0 };

                const size = newSize ? newSize : PFPSize;

                X = Math.min(X, 0); //bound right side
                Y = Math.min(Y, 0); //bound top side

                /*
                    Bound Left side.
                    Code is very clean because image width is originally fit into the div elements width
                */
                X = Math.max(
                    X,
                    -(
                        ((PFPElement.current.clientWidth / PFPDim.width) *
                            PFPDim.width) /
                            (100 / size) -
                        PFPElement.current.clientWidth
                    )
                );

                /*
                    Bound Bottom side.
                    Calculation explanation:

                    Pixel ratio between div formatted width and original image's width *
                    Height of the original image = 
                    div formatted height

                    then divide by the ratio: size of original pixel / size of current pixel to adjust for size 
                    and subtract height of the div element to find how many pixels down the picture can move before clipping
                */
                Y = Math.max(
                    -(
                        ((PFPElement.current.clientWidth / PFPDim.width) *
                            PFPDim.height) /
                            (100 / size) -
                        PFPElement.current.clientHeight
                    ),
                    Y
                );

                return { X, Y };
            }

            //return new position of image given a mouse drage event
            //position change rate scales based off of image size (zoom)
            function newPos(ev: DragEvent) {
                if (!PFPElement.current) return { X: 0, Y: 0 };

                let XOffSet =
                    InitialPFPPos.X +
                    ((ev.offsetX - InitialOffset.X) / 5) * //remove initial offset from total offset (stops weird initial jitter)
                        (PFPSize / 100);

                let YOffSet =
                    InitialPFPPos.Y +
                    ((ev.offsetY - InitialOffset.Y) / 5) * (PFPSize / 100);

                return PosBound({
                    X: XOffSet,
                    Y: YOffSet,
                });
            }

            function dragStartEvent(ev: DragEvent) {
                var img: HTMLImageElement = new Image();
                img.src =
                    "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
                ev.dataTransfer?.setDragImage(img, 0, 0);
                //set initial offset
                InitialOffset = {
                    X: ev.offsetX,
                    Y: ev.offsetY,
                };
            }

            //update new initial pos and update pos of image
            function dragEndEvent(ev: DragEvent) {
                InitialPFPPos = newPos(ev);

                SetPFPPos(InitialPFPPos);
                InitialOffset = {
                    X: 0,
                    Y: 0,
                };
            }

            //change pos of the image based on the initialPFPPos + the X Y drag distance
            function dragEvent(ev: DragEvent) {
                SetPFPPos(newPos(ev));
            }

            PFPElement.current?.addEventListener("drag", dragEvent);
            PFPElement.current?.addEventListener("dragend", dragEndEvent);
            PFPElement.current?.addEventListener("dragstart", dragStartEvent);
            PFPElement.current?.addEventListener("wheel", wheelEvent);

            return () => {
                PFPElement.current?.removeEventListener("drag", dragEvent);
                PFPElement.current?.removeEventListener(
                    "dragstart",
                    dragStartEvent
                );
                PFPElement.current?.removeEventListener(
                    "dragend",
                    dragEndEvent
                );
                PFPElement.current?.removeEventListener("wheel", wheelEvent);
            };
        }, [PFPElement, PFPSize, PFPDim]);

        //Sends a PFP upload request using FormData
        function handlePFPUpload(e: React.FormEvent<HTMLFormElement>) {
            e.preventDefault();
            if (PFPElement.current && PFP.current && PFP.current.files) {
                const formData = new FormData();

                formData.append("PFPSize", PFPSize.toString());

                const PixelSize = PFPSize / 100; //# of pixels required to represnt 1 actual pixel from the image

                formData.append(
                    "PFPOffSetX", //X off set in px / width of div image sample element = X off set in % then adjust for PixelSize
                    (
                        PFPPos.X /
                        PFPElement.current?.clientWidth /
                        PixelSize
                    ).toString()
                );

                formData.append(
                    "PFPOffSetY",
                    (
                        PFPPos.Y /
                        PFPElement.current?.clientHeight /
                        PixelSize
                    ).toString()
                );
                formData.append("PFP", PFP.current.files[0]);
                Upload("UploadUserPFP", formData);
            }
        }

        function PFPUpload() {
            if (PFP.current && PFP.current.files) {
                const url = URL.createObjectURL(PFP.current.files[0]);

                SetPFPSample(url);
                getImageSize(url).then((dimension) => {
                    SetPFPDim(dimension);
                    SetPFPSize(
                        Math.max(
                            100,
                            (dimension.width / dimension.height) * 100
                        )
                    );
                });
            }
        }

        return (
            <div className="UploadPFP-Body">
                <h3>Upload PFP</h3>
                <form onSubmit={handlePFPUpload}>
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        ref={PFP}
                        onChange={PFPUpload}
                    />
                    <div
                        className="UploadPFP-Image"
                        ref={PFPElement}
                        draggable={true}
                        style={{
                            backgroundImage: `url(${PFPSample})`,
                            backgroundSize: `${PFPSize}%`,
                            backgroundPosition: `${PFPPos.X}px ${PFPPos.Y}px`,
                        }}
                    ></div>
                    <button type="submit">SUBMIT</button>
                </form>
            </div>
        );
    }

    return (
        <Popup trigger={<button className="Sidebar-Button">Upload PFP</button>}>
            <UploadPFPBody />
        </Popup>
    );
}
