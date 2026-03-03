import React from 'react'

export const OverviewProduct = () => {
  return (
   <div 
    //   ref={panelRef}
      className='card-filters-panel absolute overflow-y-auto z-60 right-[10%] bg-amber-200 w-[500px] h-[80vh] top-0'
      style={{
        overscrollBehavior: 'contain', // Prevenir scroll chaining
        isolation: 'isolate', // Crear stacking context propio
      }}
    >
        <p>Precio</p>
        <p>Color</p>
        <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Officia nihil dicta cum, voluptate recusandae blanditiis quasi reprehenderit accusamus distinctio, obcaecati doloribus in itaque quos repellendus nisi? Quam eligendi placeat optio non repellendus, quisquam debitis dolore cupiditate est magni eaque impedit laudantium distinctio amet molestias, aliquid consequuntur porro aspernatur quas alias laborum quidem veniam adipisci necessitatibus. Eveniet, esse consequatur cumque nemo, sapiente hic aut placeat nulla consectetur molestias, id provident laborum assumenda officiis quo aspernatur ullam exercitationem neque optio nam necessitatibus? Rem, dignissimos expedita ipsum quos omnis autem officiis praesentium earum, nam eum sapiente deleniti, eius corporis quod voluptatum cumque odit.
        </p>
        <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Officia nihil dicta cum, voluptate recusandae blanditiis quasi reprehenderit accusamus distinctio, obcaecati doloribus in itaque quos repellendus nisi? Quam eligendi placeat optio non repellendus, quisquam debitis dolore cupiditate est magni eaque impedit laudantium distinctio amet molestias, aliquid consequuntur porro aspernatur quas alias laborum quidem veniam adipisci necessitatibus. Eveniet, esse consequatur cumque nemo, sapiente hic aut placeat nulla consectetur molestias, id provident laborum assumenda officiis quo aspernatur ullam exercitationem neque optio nam necessitatibus? Rem, dignissimos expedita ipsum quos omnis autem officiis praesentium earum, nam eum sapiente deleniti, eius corporis quod voluptatum cumque odit.
        </p>
    </div>
  )
}
